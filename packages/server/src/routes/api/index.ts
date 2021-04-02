import express from 'express';

import playlists from './playlists';
import rooms from './rooms';

const apiRouter = express.Router();

apiRouter.use('/playlists', playlists);
apiRouter.use('/rooms', rooms);

export default apiRouter;