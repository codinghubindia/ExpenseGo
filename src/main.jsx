import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { registerSW } from './registerSW';
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

registerSW();
