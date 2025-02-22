import { createTheme } from '@mui/material';

const getTheme = (mode) => ({
  palette: {
    mode,
    primary: {
      main: mode === 'dark' ? '#3B82F6' : '#2563EB',
      light: '#60A5FA',
      dark: '#1D4ED8',
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: mode === 'dark' ? '#10B981' : '#059669',
      light: '#34D399',
      dark: '#047857',
      contrastText: '#FFFFFF'
    },
    background: {
      default: mode === 'dark' ? '#0F172A' : '#F1F5F9',
      paper: mode === 'dark' ? '#1E293B' : '#FFFFFF',
      subtle: mode === 'dark' ? '#334155' : '#E2E8F0'
    },
    text: {
      primary: mode === 'dark' ? '#F8FAFC' : '#0F172A',
      secondary: mode === 'dark' ? '#94A3B8' : '#64748B',
      disabled: mode === 'dark' ? '#475569' : '#CBD5E1'
    },
    divider: mode === 'dark' ? '#334155' : '#E2E8F0',
    action: {
      active: mode === 'dark' ? '#94A3B8' : '#64748B',
      hover: mode === 'dark' ? 'rgba(148, 163, 184, 0.08)' : 'rgba(100, 116, 139, 0.08)',
      selected: mode === 'dark' ? 'rgba(148, 163, 184, 0.16)' : 'rgba(100, 116, 139, 0.16)'
    }
  },
  shape: {
    borderRadius: 12
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 600
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600
    },
    h4: {
      fontSize: {
        xs: '1.5rem',
        sm: '2rem'
      },
      fontWeight: 600
    },
    h6: {
      fontSize: {
        xs: '1.1rem',
        sm: '1.25rem'
      },
      fontWeight: 500
    },
    body1: {
      fontSize: '1rem'
    },
    body2: {
      fontSize: '0.875rem'
    },
    caption: {
      fontSize: '0.75rem'
    }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: mode === 'dark' 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          transition: 'box-shadow 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none'
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          transition: 'all 0.2s ease-in-out'
        }
      },
      defaultProps: {
        elevation: 0
      }
    }
  }
});

export const createAppTheme = (mode) => createTheme(getTheme(mode)); 