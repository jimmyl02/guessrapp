import ws from 'ws';
import { IncomingMessage } from 'node:http';

import { server } from '../index';

const wsServer = new ws.Server({ noServer: true, path: '/ws' })

server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, (socket: ws, request: IncomingMessage) => {
        wsServer.emit('connection', socket, request);
      });
});

export default wsServer;