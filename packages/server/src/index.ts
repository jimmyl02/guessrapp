import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';

dotenv.config();

import router from './routes';

export const app: express.Application = express();

// Setup middleware
app.use(express.json());

const corsOptions = {
    origin: '*'
};

app.use(cors(corsOptions));

// Setup router
app.use(router);

const staticPath = path.join(__dirname, '../../client/build');
app.use(express.static(staticPath));

app.all('*', function (req, res) {
    res.sendFile(path.join(__dirname, '../../client/build/index.html'));
});

export const server = app.listen(8080, () => {
    console.log('App is listening on port 8080');
});

// Start game manager
import('./game/manager');