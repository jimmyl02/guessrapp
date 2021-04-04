import wsServer from '../websocket';
import client, { subClient } from '../cache';
import { startGame } from './game';

import { ResponseStatus, WebSocketResponse, RedisPubSubMessageType, RedisPubSubMessage, WebSocketResponseData, WebSocketResponseType } from '../ts/types';
import WebSocket from 'ws';
import { Song } from '../database/songs';

interface RedisJoinRoomMessage extends RedisPubSubMessage {
    data: string;
}

interface RedisSendMessageMessage extends RedisPubSubMessage {
    data: {
        username: string;
        message: string;
    };
}

interface RedisRenderMessageMessage extends RedisPubSubMessage {
    data: {
        info: boolean;
        username?: string;
        text: string;
    };
}

interface RedisScoreInfoMessage extends RedisPubSubMessage {
    data: {
        username: string;
        score: number;
    }
}

export enum GameStatus {
    lobby = 0,
    inround = 1,
    inreplay = 2
}

interface WebSocketClients {
    [roomId: string]: WebSocket[];
}

const currentlyHostedRooms: Set<string> = new Set();
const webSocketClients: WebSocketClients = {};

const sendSuccess = async (ws: WebSocket, message: WebSocketResponseData): Promise<void> => {
    const resp: WebSocketResponse = {
        status: ResponseStatus.success,
        data: message
    }
    const stringifiedResp = await JSON.stringify(resp);
    ws.send(stringifiedResp);
}

/**
 * Send error message to WebSocket
 * @param ws WebSocket to send message to
 * @param message message to send
 */
const sendError = async (ws: WebSocket, message: string): Promise<void> => {
    const resp: WebSocketResponse = {
        status: ResponseStatus.error,
        data: message
    }
    const stringifiedResp = await JSON.stringify(resp);
    ws.send(stringifiedResp);
}

/**
 * Subscriber listener which processes all relevant channels to this node instance
 */
subClient.on('message', async (channel, message) => {
    //console.log(channel, message); // DEBUG: See sub messages
    const roomId = channel;
    let parsed = null;
    try {
        parsed = await JSON.parse(message.toString());
    } catch(err) {
        return;
    }
    const type = parsed['type'];
    const data = parsed['data'];

    if (currentlyHostedRooms.has(roomId)) {
        // if the channel points to a room id this node is handling, we must process it
        // this is to ensure there is never double processng
        switch (type) {
            case RedisPubSubMessageType.sendMessage: {
                // this handler intercepts all sentMesssage events and republishes renderMessage with correct option
                const username = data['username'];
                const message = data['message'];
                if (username) {
                    const roomKey = 'games:room-' + roomId;
                    const gameStatus = <GameStatus>Number(await client.hget(roomKey, 'gameStatus'));
                    
                    if (gameStatus == GameStatus.inround) {
                        const currentSong = await client.lrange('games:songs:room-' + roomId, 0, 0);
                        const parsedCurrentSong: Song = await JSON.parse(currentSong[0]);
                        const alreadyGuessed = await client.hexists('games:round-scores:room-' + roomId, username);
                        
                        if (!alreadyGuessed && parsedCurrentSong['name'].toLowerCase() == message.toLowerCase()) {
                            // user guessed song name right
                            // increment user score based on interval left
                            // scoring formula is 50 + (50 - 1/2*(total - elapsed))
                            const totalTime = Number(await client.hget(roomKey, 'roundLength'))
                            const elapsedTime = Number(await client.hget(roomKey, 'tickCounter'));
                            const roundScore = 100 - (Math.floor(50 * (elapsedTime / totalTime)));
    
                            await client.hset('games:round-scores:room-' + roomId, username, roundScore);

                            // Republish with RedisPubSubMessageType.renderMessage
                            const redisMessage: RedisRenderMessageMessage = {
                                type: RedisPubSubMessageType.renderMessage,
                                data: {
                                    info: true,
                                    text: username + ' has gussed the song name!'
                                }
                            }
                            await client.publish(roomId, await JSON.stringify(redisMessage));

                            const redisMessage2: RedisScoreInfoMessage = {
                                type: RedisPubSubMessageType.scoreInfo,
                                data: {
                                    username: username,
                                    score: roundScore
                                }
                            }
                            await client.publish(roomId, await JSON.stringify(redisMessage2));
                            // Future: Add check to see if artist was guessed properly
                        } else {
                            // user guessed it wrong, just render text
                            const redisMessage: RedisRenderMessageMessage = {
                                type: RedisPubSubMessageType.renderMessage,
                                data: {
                                    info: false,
                                    username: username,
                                    text:  message
                                }
                            }
                            await client.publish(roomId, await JSON.stringify(redisMessage));
                        }
                    }
                }
                break;
            }
        }
    }

    const targetWebSockets = webSocketClients[roomId];
    if (targetWebSockets) {
        // we have clients connected from target roomId
        switch (type) {
            case RedisPubSubMessageType.leaveRoom: {
                // handler which forwards leaveRoom event
                for (const ws of targetWebSockets) {
                    const messageData: WebSocketResponseData = {
                        type: WebSocketResponseType.leaveRoom,
                        data: data
                    }
                    await sendSuccess(ws, messageData);
                }
                break;
            }
            case RedisPubSubMessageType.newPlayer: {
                // handler which forwards joinedRoom action with username as data
                for (const ws of targetWebSockets) {
                    const messageData: WebSocketResponseData = {
                        type: WebSocketResponseType.newPlayer,
                        data: data
                    }
                    await sendSuccess(ws, messageData);
                }
                break;
            }
            case RedisPubSubMessageType.renderMessage: {
                // this handler assumes all processing is done and just tells client to render with info flag
                for (const ws of targetWebSockets) {
                    const messageData: WebSocketResponseData = {
                        type: WebSocketResponseType.renderMessage,
                        data: data
                    }
                    await sendSuccess(ws, messageData);
                }
                break;
            }
            case RedisPubSubMessageType.roundStart: {
                // pass event with preview_url to client
                for (const ws of targetWebSockets) {
                    const messageData: WebSocketResponseData = {
                        type: WebSocketResponseType.roundStart,
                        data: data
                    }
                    await sendSuccess(ws, messageData);
                }
                break;
            }
            case RedisPubSubMessageType.roundOver: {
                // pass event with song name and artists to client
                for (const ws of targetWebSockets) {
                    const messageData: WebSocketResponseData = {
                        type: WebSocketResponseType.roundOver,
                        data: data
                    }
                    await sendSuccess(ws, messageData);
                }
                break;
            }
            case RedisPubSubMessageType.gameOver: {
                // notify client via type that game is over
                for (const ws of targetWebSockets) {
                    const messageData: WebSocketResponseData = {
                        type: WebSocketResponseType.gameOver,
                        data: data
                    }
                    await sendSuccess(ws, messageData);
                }
                break;
            }
            case RedisPubSubMessageType.scoreInfo: {
                // pass event with new scoreInfo to client
                for (const ws of targetWebSockets) {
                    const messageData: WebSocketResponseData = {
                        type: WebSocketResponseType.scoreInfo,
                        data: data
                    }
                    await sendSuccess(ws, messageData);
                }
                break;
            }
        }
    }
});

/**
 * Management of websocket connections and associated clients
 */
wsServer.on('connection', (ws) => {
    // we have a new connection from a client
    let roomId: string | undefined = null; // tracks what room client is in as well as whether or not client is in a room
    let username: string | undefined = null;
    // if we receive a message, we should process the body and send appropriate action to redis pubsub
    ws.on('message', async (message) => {
        let parsed = null;
        try {
            parsed = await JSON.parse(message.toString());
        } catch(err) {
            return;
        }

        if (parsed) {
            const type = parsed['type'];
            const data = parsed['data'];

            if (type && data) {
                // request has both type and data parameters
                switch (type) {
                    case 'joinRoom': {
                        if (!roomId) {
                            const requestedRoomId = data['roomId'];
                            if (typeof requestedRoomId == 'string') {
                                const requestedRoomKey = 'games:room-' + requestedRoomId;
                                const roomExists = await client.exists(requestedRoomKey);
                                if (roomExists) {
                                    const tmpUsername = data['username'];
                                    if (tmpUsername) {
                                        const isMember = await client.sismember('games:users:room-' + requestedRoomId, tmpUsername);
                                        if (!isMember) {
                                            // this room already exists and username is free so we can just join it and sub
                                            username = tmpUsername;
                                            roomId = requestedRoomId;
                                            
                                            const redisMessage: RedisJoinRoomMessage = {
                                                type: RedisPubSubMessageType.newPlayer,
                                                data: username
                                            }
                                            await client.publish(roomId, await JSON.stringify(redisMessage));
                                            await subClient.subscribe(roomId);

                                            // add username to set which contains current room users
                                            await client.sadd('games:users:room-' + roomId, username);

                                            // add websocket to receive processed messages from pub
                                            if (webSocketClients[roomId]) {
                                                webSocketClients[roomId].push(ws);
                                            } else {
                                                webSocketClients[roomId] = [ws];
                                            }
                                            // Future: if room is ingame, add to games:scores

                                            // return information about current room
                                            const connectedUsers = await client.smembers('games:users:room-' + roomId);
                                            const gameStatus = <GameStatus>Number(await client.hget('games:room-' + roomId, 'gameStatus'));
                                            const totalScores = await client.hgetall('games:scores:room-' + roomId);
                                            const roundScores = await client.hgetall('games:round-scores:room-' + roomId);
                                            const playlistId = await client.hget('games:room-' + roomId, 'playlistId');
                                            const messageData: WebSocketResponseData = {
                                                type: WebSocketResponseType.joinedRoom,
                                                data: {
                                                    connectedUsers: connectedUsers,
                                                    gameStatus: gameStatus,
                                                    totalScores: totalScores,
                                                    roundScores: roundScores,
                                                    playlistId: playlistId
                                                }
                                            }
                                            await sendSuccess(ws, messageData);
                                        } else {
                                            await sendError(ws, 'username is in use');
                                        }
                                    } else {
                                        await sendError(ws, 'no username was provided');
                                    }
                                } else {
                                    await sendError(ws, 'room does not exist');
                                }
                            } else {
                                await sendError(ws, 'invalid room id');
                            }
                        } else {
                            await sendError(ws, 'already in a room');
                        }
                        break;
                    }
                    case 'sendMessage': {
                        if (roomId) {
                            const roomKey = 'games:room-' + roomId;
                            const gameStatus = <GameStatus>Number(await client.hget(roomKey, 'gameStatus'));

                            if (gameStatus == GameStatus.lobby || gameStatus == GameStatus.inreplay) {
                                const redisMessage: RedisRenderMessageMessage = {
                                    type: RedisPubSubMessageType.renderMessage,
                                    data: {
                                        info: false,
                                        username: username,
                                        text: data
                                    }
                                }
                                await client.publish(roomId, await JSON.stringify(redisMessage));
                            } else {
                                const redisMessage: RedisSendMessageMessage = {
                                    type: RedisPubSubMessageType.sendMessage,
                                    data: {
                                        username: username,
                                        message: data
                                    }
                                };
                                await client.publish(roomId, await JSON.stringify(redisMessage));
                            } 
                        } else {
                            await sendError(ws, 'not in a room');
                        }
                        break;
                    }
                }
            } else if (type) {
                // only type parameter was sent
                switch (type) {
                    case 'startGame': {
                        if (roomId) {
                            const roomKey = 'games:room-' + roomId;
                            const gameStatus = <GameStatus>Number(await client.hget(roomKey, 'gameStatus'));
                            if (gameStatus == GameStatus.lobby) {
                                // currently in the lobby which means this client will host this game and this server instance controls it
                                currentlyHostedRooms.add(roomId);
                                // start game worker (each worker is essentially a 'server')
                                startGame(roomId);
                            } else {
                                await sendError(ws, 'game is already in progress');
                            }
                        } else {
                            await sendError(ws, 'not in a room');
                        }
                        break;
                    }
                    case 'leaveRoom': {
                        if (roomId) {
                            // close websocket
                            ws.close();
                        } else {
                            await sendError(ws, 'not in a room');
                        }
                        break;
                    }
                }
            } else {
                await sendError(ws, 'invalid request');
            }
        }
    });

    ws.on('close', async () => {
        // Fire leave room event for client
        if (roomId) {
            // remove ws from tracked websockets by room; if empty after remove, remove from currentlyHostedRooms
            const targetSocketClients = webSocketClients[roomId];
            webSocketClients[roomId] = targetSocketClients.filter((trackedWs) => {
                // Essentially get rid of all closed or closing web sockets, was broken previously
                return (trackedWs.readyState != WebSocket.CLOSED && trackedWs.readyState != WebSocket.CLOSING);
            });

            // publish notification that user left the room
            const redisMessage: RedisPubSubMessage = {
                type: RedisPubSubMessageType.leaveRoom,
                data: username
            }
            await client.publish(roomId, await JSON.stringify(redisMessage));

            // remove user from game room
            await client.srem('games:users:room-' + roomId, username);
        }
    });
});