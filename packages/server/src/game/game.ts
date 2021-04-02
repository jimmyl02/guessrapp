import * as db from '../database';
import client from '../cache';
import { AdjustingTimer } from '../util/timer';

import { GameStatus } from './manager';
import { RedisPubSubMessage, RedisPubSubMessageType } from '../ts/types';
import { Song } from '../database/songs';

interface GameConfig {
    roomId: string;
    playlistId: string;
    numRounds: number;
    roundLength: number;
    replayLength: number;
}

/**
 * Get random number such that [min, max)
 * @param min min bound
 * @param max max bound
 * @returns  random integer between the bounds
 */
 const getRandomInt = (min:number, max: number): number => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
  }

/**
 * Start a game and the associated timers
 * @param roomId room id which is now starting a game
 */
export const startGame = async (roomId: string): Promise<void> => {
    // Get configuration settings of room from redis
    const roomKey = 'games:room-' + roomId;
    const gameConfig: GameConfig = {
        roomId: roomId,
        playlistId: await client.hget(roomKey, 'playlistId'),
        numRounds: Number(await client.hget(roomKey, 'numRounds')),
        roundLength: Math.min(30, Number(await client.hget(roomKey, 'roundLength'))),
        replayLength: Math.min(30, Number(await client.hget(roomKey, 'replayLength')))
    };
    const allPossibleSongs = await db.songs.getSongsByPlaylistId(gameConfig.playlistId);
    const shuffleIndexes = [];

    // Shuffle using fisher-yates algorithm
    // First create shuffleIndexes array so we are just shuffling indexes and not the actual objects
    for (let i = 0; i < allPossibleSongs.length; i++) {
        shuffleIndexes.push(i);
    }
    for (let i = shuffleIndexes.length - 1; i > 0; i--) {
        const j = getRandomInt(0, i + 1);
        const tmp: number = shuffleIndexes[i];
        shuffleIndexes[i] = shuffleIndexes[j];
        shuffleIndexes[j] = tmp;
    }

    // Enque songs into redis namespace games:songs:
    let roundsRemaining = Math.min(gameConfig.numRounds, allPossibleSongs.length)
    for (let i = 0; i < roundsRemaining; i++) {
        const actualIndex = shuffleIndexes[i];
        await client.rpush('games:songs:room-' + roomId, await JSON.stringify(allPossibleSongs[actualIndex]));
    }

    // Prepare scores trackers by zeroing out round and total scores
    await client.del('games:scores:room-' + roomId);
    await client.del('games:round-scores:room-' + roomId);

    // Add initial players to global score
    const initialPlayers = await client.smembers('games:users:room-' + roomId);
    for (const username of initialPlayers) {
        await client.hset('games:scores:room-' + roomId, username, 0);
    }

    // Use self correcting interval to track game state
    // Send first song and begin ticker
    await client.hset(roomKey, 'tickCounter', 0);
    await client.hset(roomKey, 'gameStatus', GameStatus.inround);

    const currentSong = await client.lrange('games:songs:room-' + roomId, 0, 0);
    const parsedCurrentSong: Song = await JSON.parse(currentSong[0]);
    const redisMessage: RedisPubSubMessage = {
        type: RedisPubSubMessageType.roundStart,
        data: parsedCurrentSong['preview_url']
    }
    await client.publish(roomId, await JSON.stringify(redisMessage));

    const incrementTickAndProcess = async () => {
        const tickCounter = Number(await client.hincrby(roomKey, 'tickCounter', 1));
        const gameStatus = Number(await client.hget(roomKey, 'gameStatus'));
        if (gameStatus == GameStatus.inround && tickCounter >= gameConfig.roundLength) { // use >= to hopefully counter drift
            // initial playing should now be over, update game via redis
            await client.hset(roomKey, 'gameStatus', GameStatus.inreplay);
            await client.hset(roomKey, 'tickCounter', 0);

            // coalesce round scores into total score from namespace 'games:round-scores:' to 'games:scores:'
            const roundScores = await client.hgetall('games:round-scores:room-' + roomId);
            Object.keys(roundScores).forEach(async (username) => {
                await client.hincrby('games:scores:room-' + roomId, username, Number(roundScores[username]));
            });

            // publish roundOver message
            const currentSong = await client.lpop('games:songs:room-' + roomId);
            const redisMessage: RedisPubSubMessage = {
                type: RedisPubSubMessageType.roundOver,
                data: await JSON.parse(currentSong)
            }
            await client.publish(roomId, await JSON.stringify(redisMessage));
        } else if (gameStatus == GameStatus.inreplay && tickCounter >= gameConfig.replayLength) { // use >= to hopefully counter drift
            // replay should be over, update game via redis
            roundsRemaining -= 1;
            if (roundsRemaining != 0) {
                // change phase to initial playing and update
                await client.del('games:round-scores:room-' + roomId); // clear round scores from previous round
                await client.hset(roomKey, 'gameStatus', GameStatus.inround);
                await client.hset(roomKey, 'tickCounter', 0); 

                // send out song preview url
                const currentSong = await client.lrange('games:songs:room-' + roomId, 0, 0);
                const parsedCurrentSong: Song = await JSON.parse(currentSong[0]);
                const redisMessage: RedisPubSubMessage = {
                    type: RedisPubSubMessageType.roundStart,
                    data: parsedCurrentSong['preview_url']
                }
                await client.publish(roomId, await JSON.stringify(redisMessage));
            } else {
                // game is over, stop ticker and pub gameOver message
                ticker.stop();
                const redisMessage: RedisPubSubMessage = {
                    type: RedisPubSubMessageType.gameOver
                }
                await client.hset(roomKey, 'gameStatus', GameStatus.lobby);
                await client.publish(roomId, await JSON.stringify(redisMessage));
            }
        }
    }

    const warnDrift = () => {
        console.log('[!] ' + roomId +  ' drift exceeded');
    }
    const ticker = new AdjustingTimer(incrementTickAndProcess, 1000, warnDrift);

    ticker.start();
}