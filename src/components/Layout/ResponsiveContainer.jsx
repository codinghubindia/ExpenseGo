import { Box } from '@mui/material';

const ResponsiveContainer = ({ children }) => (
  <Box
    sx={{
      width: '100%',
      maxWidth: {
        xs: '100%',
        sm: '540px',
        md: '720px',
        lg: '960px',
        xl: '1140px'
      },
      mx: 'auto',
      px: {
        xs: 2,
        sm: 3,
        md: 4
      }
    }}
  >
    {children}
  </Box>
);

export default ResponsiveContainer; 