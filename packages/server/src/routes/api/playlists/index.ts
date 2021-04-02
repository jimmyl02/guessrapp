import express from 'express';

import create from './create';

const playlistsRouter = express.Router();

playlistsRouter.route('/create')
    .post(create);

export default playlistsRouter;