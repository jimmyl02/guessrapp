import { Request, Response } from 'express';
import Ajv from 'ajv';
import client from '../../../cache';

import { RequestResponse, ResponseStatus } from '../../../ts/types';

const ajv = new Ajv({ allErrors: true });

const schema = {
    type: 'object',
    properties: {
        roomId: {
            type: 'string'
        },
    },
    required: ['roomId']
};

const validate = ajv.compile(schema);

/**
 * /api/rooms/create
 * Handles creating rooms for which people can join using webSockets 
 */
const handler = async (req: Request, res: Response): Promise<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const body = req.body;
    if (validate(body)) {
        const { roomId } = body;
        const roomKey = 'games:room-' + roomId;
        const roomExists = await client.exists(roomKey);

        return res.send(<RequestResponse>({ status: ResponseStatus.success, data: roomExists }));
    } else {
        return res.send(<RequestResponse>({ status: ResponseStatus.error, data: validate.errors }));
    }
};

export default handler;