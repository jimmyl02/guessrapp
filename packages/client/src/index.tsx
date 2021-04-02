import React from 'react';
import ReactDOM from 'react-dom';
import { ChakraProvider } from '@chakra-ui/react';

import RootRouter from './router';

ReactDOM.render(
  <React.StrictMode>
      <ChakraProvider>
        <RootRouter />
      </ChakraProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
