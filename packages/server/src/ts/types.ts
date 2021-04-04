export enum ResponseStatus {
    success = 'success',
    error = 'error'
}

export interface FetchResponse {
    status: ResponseStatus;
    [otherOptions: string]: unknown;
}

export interface RequestResponse {
    status: ResponseStatus;
    [otherOptions: string]: unknown;
}

export interface WebSocketResponse {
    status: ResponseStatus;
    [otherOptions: string]: unknown;
}

export interface WebSocketResponseData {
    type: string;
    data: unknown;
}

export enum WebSocketResponseType {
    joinedRoom = 'joinedRoom',
    leaveRoom = 'leaveRoom',
    newPlayer = 'newPlayer',
    renderMessage = 'renderMessage',
    roundStart = 'roundStart',
    roundOver = 'roundOver',
    gameOver = 'gameOver',
    scoreInfo = 'scoreInfo'
}

export enum RedisPubSubMessageType { // using strings for now but might switch later to numbers for better efficiency
    // these messages are from client to node which need to be processed
    startGame = 'startGame',
    sendMessage = 'sendMessage',
    // these messages are passed internally from host node to other nodes or represent actions for connection nodes
    leaveRoom = 'leaveRoom',
    joinedRoom = 'joinedRoom',
    newPlayer = 'newPlayer',
    renderMessage = 'renderMessage', // this is used to render the message itself
    scoreInfo = 'scoreInfo',
    roundStart = 'roundStart',
    roundOver = 'roundOver',
    gameOver = 'gameOver'
}

export interface RedisPubSubMessage {
    type: RedisPubSubMessageType;
    [otherOptions: string]: unknown;
}