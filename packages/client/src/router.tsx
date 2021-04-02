import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom';

import Home from './containers/Home';
import Room from './containers/Room';

const RootRouter = () => {
    return (
        <BrowserRouter>
            <Switch>
                <Route exact path='/' component={Home} />
                <Route path='/room/:id' component={Room} />
                <Redirect to="/" />
            </Switch>
        </BrowserRouter>
    );
};

export default RootRouter;