/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  Alert,
  Divider,
  Card,
  CardContent,
  Stack,
  IconButton,
  Tooltip,
  useTheme,
  InputLabel,
  Grid
} from '@mui/material';
import {
  Language as LanguageIcon,
  Security as SecurityIcon,
  Backup as BackupIcon,
  ColorLens as ThemeIcon,
  Notifications as NotificationsIcon,
  AccountBalance as AccountIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon
} from '@mui/icons-material';
import { useRegion } from '../../contexts/RegionContext';
import { regionSettings } from '../../contexts/RegionContext';
import { useApp } from '../../contexts/AppContext';
import BackupRestore from '../../components/BackupRestore';

function Settings() {
  const theme = useTheme();
  const { region, updateRegion } = useRegion();
  const { theme: appTheme, setTheme } = useApp();
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState(true);

  // Add default region handling
  useEffect(() => {
    if (!region) {
      updateRegion('IN');
    }
  }, [region, updateRegion]);

  // Add effect to handle theme changes
  useEffect(() => {
    // Update local storage when theme changes
    localStorage.setItem('theme', appTheme);
  }, [appTheme]);

  const handleRegionChange = (event) => {
    try {
      const newRegion = event.target.value;
      updateRegion(newRegion);
      localStorage.setItem('userRegion', newRegion); // Persist the selection
    } catch (err) {
      setError('Failed to update region settings');
    }
  };

  const handleThemeChange = (checked) => {
    setTheme(checked ? 'dark' : 'light');
  };

  const handleBackup = async () => {
    try {
      // TODO: Implement backup functionality
      setBackupDialogOpen(false);
    } catch (err) {
      setError('Failed to create backup');
    }
  };

  const handleSetPin = async () => {
    try {
      if (!pin || pin.length < 4) {
        throw new Error('PIN must be at least 4 digits');
      }
      if (pin !== confirmPin) {
        throw new Error('PINs do not match');
      }
      // TODO: Implement PIN setting logic
      setPinDialogOpen(false);
      setPin('');
      setConfirmPin('');
    } catch (err) {
      setError(err.message);
    }
  };

  // Update the error check to handle initialization
  if (!region || !regionSettings[region]) {
    const defaultRegion = 'IN';
    updateRegion(defaultRegion);
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Setting default region to India...
        </Alert>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Settings
        </Typography>
        <Typography color="text.secondary">
          Customize your application preferences and settings
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Regional Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <LanguageIcon color="primary" />
                <Typography variant="h6">Regional Settings</Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              
              <FormControl fullWidth>
                <InputLabel>Region</InputLabel>
                <Select
                  value={region}
                  onChange={handleRegionChange}
                  label="Region"
                >
                  {Object.entries(regionSettings).map(([code, data]) => (
                    <MenuItem key={code} value={code}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography>{data.name}</Typography>
                        <Typography color="text.secondary">
                          ({data.currency.symbol})
                        </Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        {/* Appearance Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <ThemeIcon color="primary" />
                <Typography variant="h6">Appearance</Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              
              <List disablePadding>
                <ListItem>
                  <ListItemIcon>
                    {appTheme === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                  </ListItemIcon>
                  <ListItemText 
                    primary="Dark Mode"
                    secondary="Toggle dark/light theme"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={appTheme === 'dark'}
                      onChange={(e) => handleThemeChange(e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">Security</Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              
              <Button
                variant="outlined"
                startIcon={<SecurityIcon />}
                onClick={() => setPinDialogOpen(true)}
                fullWidth
              >
                Set up PIN Protection
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Backup & Restore */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <BackupIcon color="primary" />
                <Typography variant="h6">Backup & Restore</Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              
              <BackupRestore />
            </CardContent>
          </Card>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <NotificationsIcon color="primary" />
                <Typography variant="h6">Notifications</Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              
              <List disablePadding>
                <ListItem>
                  <ListItemIcon>
                    <NotificationsIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Push Notifications"
                    secondary="Receive alerts and reminders"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={notifications}
                      onChange={(e) => setNotifications(e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* About */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <InfoIcon color="primary" />
                <Typography variant="h6">About</Typography>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              
              <Stack spacing={1}>
                <Typography variant="body1">
                  ExpenseGo v1.0.0
                </Typography>
                <Typography color="text.secondary">
                  A simple and efficient expense tracking application
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* PIN Dialog */}
      <Dialog 
        open={pinDialogOpen} 
        onClose={() => {
          setPinDialogOpen(false);
          setPin('');
          setConfirmPin('');
        }}
      >
        <DialogTitle>Set Security PIN</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Enter PIN"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              fullWidth
              required
              inputProps={{ maxLength: 6 }}
            />
            <TextField
              label="Confirm PIN"
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              fullWidth
              required
              inputProps={{ maxLength: 6 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPinDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSetPin} variant="contained">
            Set PIN
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Settings;