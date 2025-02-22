/* eslint-disable react/prop-types */
import React from 'react';
import { Box, CssBaseline, ThemeProvider, useMediaQuery, Typography, Button } from '@mui/material';
import { AppProvider, useApp } from './contexts/AppContext';
import { createAppTheme } from './styles/theme';
import { RegionProvider } from './contexts/RegionContext';
import { ErrorBoundary } from 'react-error-boundary';

import AppRoutes from './routes';

const ErrorFallback = ({ error }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        p: 3
      }}
    >
      <Typography variant="h5" gutterBottom>
        Something went wrong
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {error.message}
      </Typography>
      <Button
        variant="contained"
        onClick={() => window.location.reload()}
      >
        Refresh Page
      </Button>
    </Box>
  );
};

const App = () => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const systemTheme = prefersDarkMode ? 'dark' : 'light';

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div id="root" role="main">
        <AppProvider>
          <ThemedApp systemTheme={systemTheme} />
        </AppProvider>
      </div>
    </ErrorBoundary>
  );
};

const ThemedApp = ({ systemTheme }) => {
  const { theme } = useApp();
  
  const actualMode = theme === 'system' ? systemTheme : theme;
  
  const muiTheme = React.useMemo(
    () => createAppTheme(actualMode),
    [actualMode]
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          color: 'text.primary'
        }}
      >
        <RegionProvider>
          <AppRoutes />
        </RegionProvider>  
      </Box>
    </ThemeProvider>
  );
};

export default App;