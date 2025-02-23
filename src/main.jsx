import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { registerSW } from './registerSW';
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider } from './contexts/AppContext';
import { RegionProvider } from './contexts/RegionContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <AppProvider>
          <RegionProvider>
            <App />
          </RegionProvider>
        </AppProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

registerSW();
