import React from 'react';
import { Box, CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import { AppProvider, useApp } from './contexts/AppContext';
import { createAppTheme } from './styles/theme';
import AppRoutes from './routes';

const App = () => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const systemTheme = prefersDarkMode ? 'dark' : 'light';

  return (
    <AppProvider>
      <ThemedApp systemTheme={systemTheme} />
    </AppProvider>
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
        <AppRoutes />
      </Box>
    </ThemeProvider>
  );
};

export default App;