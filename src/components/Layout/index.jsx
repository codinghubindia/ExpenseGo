/* eslint-disable react/prop-types */
import React, { useMemo } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Dialog,
  DialogTitle
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  AccountBalance,
  Category,
  Assessment,
  Payment,
  DarkMode,
  LightMode,
  Computer,
  Settings,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import BackupRestore from '../BackupRestore';

const drawerWidth = {
  xs: '100%',
  sm: 280
};

const Layout = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme: appTheme, setTheme } = useApp();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState('');

  const menuItems = useMemo(() => [
    { text: 'Dashboard', icon: <Dashboard />, path: '/' },
    { text: 'Accounts', icon: <AccountBalance />, path: '/accounts' },
    { text: 'Transactions', icon: <Payment />, path: '/transactions' },
    { text: 'Categories', icon: <Category />, path: '/categories' },
    { text: 'Reports', icon: <Assessment />, path: '/reports' },
    { text: 'Settings', icon: <Settings />, path: '/settings' }
  ], []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    handleMenuClose();
  };

  const handleClose = () => {
    setOpen(false);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          ExpenseGo
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              if (isMobile) setMobileOpen(false);
            }}
            selected={location.pathname === item.path}
            sx={{
              borderRadius: 2,
              mx: 1,
              my: 0.5,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.dark'
                },
                '& .MuiListItemIcon-root': {
                  color: 'inherit'
                }
              }
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <BackupRestore />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth.sm}px)` },
          ml: { sm: `${drawerWidth.sm}px` },
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.default',
          color: 'text.primary',
          boxShadow: 'none',
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(30, 41, 59, 0.8)'   // Dark mode background
            : 'rgba(255, 255, 255, 0.8)', // Light mode background
          transition: 'all 0.2s ease-in-out',
          '& .MuiIconButton-root': {
            color: 'text.primary'
          },
          '& .MuiAvatar-root': {
            bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
            color: 'text.primary'
          }
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              display: { md: 'none' },
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.08)'
                  : 'rgba(0, 0, 0, 0.04)'
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Theme">
            <IconButton 
              onClick={handleMenuClick} 
              sx={{
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' 
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              {appTheme === 'dark' ? <DarkMode /> : 
               appTheme === 'light' ? <LightMode /> : 
               <Computer />}
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 4px 20px rgba(0,0,0,0.5)'
                  : '0 4px 20px rgba(0,0,0,0.1)'
              }
            }}
          >
            <MenuItem onClick={() => handleThemeChange('light')}>
              <ListItemIcon>
                <LightMode fontSize="small" />
              </ListItemIcon>
              Light
            </MenuItem>
            <MenuItem onClick={() => handleThemeChange('dark')}>
              <ListItemIcon>
                <DarkMode fontSize="small" />
              </ListItemIcon>
              Dark
            </MenuItem>
            <MenuItem onClick={() => handleThemeChange('system')}>
              <ListItemIcon>
                <Computer fontSize="small" />
              </ListItemIcon>
              System
            </MenuItem>
          </Menu>
          <Avatar 
            sx={{ 
              ml: 2,
              bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200',
              color: 'text.primary'
            }} 
          />
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth.sm }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth.sm,
              bgcolor: 'background.paper',
              borderRight: 1,
              borderColor: 'divider'
            }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth.sm,
              bgcolor: 'background.paper',
              borderRight: 1,
              borderColor: 'divider'
            }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { sm: `calc(100% - ${drawerWidth.sm}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
          overflow: 'hidden'
        }}
      >
        <Toolbar />
        {children}
      </Box>
      <Dialog 
        open={open} 
        onClose={handleClose}
        aria-labelledby="dialog-title"
        disableEnforceFocus
      >
        <DialogTitle id="dialog-title">
          {title}
        </DialogTitle>
        {/* ... rest of dialog content */}
      </Dialog>
    </Box>
  );
};

export default Layout; 