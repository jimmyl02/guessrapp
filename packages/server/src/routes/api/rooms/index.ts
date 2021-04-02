import express from 'express';

import create from './create';
import exists from './exists';

const roomsRouter = express.Router();

roomsRouter.route('/create')
    .post(create);
roomsRouter.route('/exists')
    .post(exists);


export default roomsRouter;