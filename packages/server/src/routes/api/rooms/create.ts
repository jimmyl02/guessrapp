import { Request, Response } from 'express';
import Ajv from 'ajv';
import { getPlaylistIdFromUrl } from '../../../util/spotify';
import client from '../../../cache';
import * as db from '../../../database';

import { RequestResponse, ResponseStatus } from '../../../ts/types';

const ajv = new Ajv({ allErrors: true });

const schema = {
    type: 'object',
    properties: {
        roomId: {
            type: 'string'
        },
        playlistUrl: {
            type: 'string'
        },
        numRounds: {
            type: 'number'
        },
        roundLength: {
            type: 'number'
        },
        replayLength: {
            type: 'number'
        }
    },
    required: ['roomId', 'playlistUrl', 'numRounds', 'roundLength', 'replayLength']
};

const validate = ajv.compile(schema);

/**
 * /api/rooms/create
 * Handles creating rooms for which people can join using webSockets 
 */
const handler = async (req: Request, res: Response): Promise<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const body = req.body;
    if (validate(body)) {
        const { roomId, playlistUrl, numRounds, roundLength, replayLength } = body;
        const roomKey = 'games:room-' + roomId;
        const roomExists = await client.exists(roomKey);
        if (!roomExists) {
            // room does not exist so we create it with default configurations
            const playlistId = getPlaylistIdFromUrl(playlistUrl);
            const requestedPlaylist = await db.playlists.getPlaylistById(playlistId);
            if (requestedPlaylist) {
                await client.hset(roomKey, 'playlistId', playlistId);
                await client.hset(roomKey, 'numRounds', numRounds);
                await client.hset(roomKey, 'roundLength', roundLength);
                await client.hset(roomKey, 'replayLength', replayLength);
                return res.send(<RequestResponse>({ status: ResponseStatus.success, data: 'room successfully created' }));
            } else {
                return res.send(<RequestResponse>({ status: ResponseStatus.error, data: 'playlist id could not be found' }));
            }
        } else {
            return res.send(<RequestResponse>({ status: ResponseStatus.error, data: 'room already exists' }));
        }
    } else {
        return res.send(<RequestResponse>({ status: ResponseStatus.error, data: validate.errors }));
    }
};

export default handler;