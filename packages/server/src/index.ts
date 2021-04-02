import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

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
app.use('/', router);

router.all('*', (req, res) => {
    res.status(404).send('Route not found');
});

export const server = app.listen(8080, () => {
    console.log('App is listening on port 8080');
});

// Start game manager
import('./game/manager');