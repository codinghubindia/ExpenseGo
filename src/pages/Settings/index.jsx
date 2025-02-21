/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
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
} from '@mui/material';
import { useRegion } from '../../contexts/RegionContext';
import { regionSettings } from '../../contexts/RegionContext';

function Settings() {
  const { region, updateRegion } = useRegion();
  const [darkMode, setDarkMode] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [error, setError] = useState(null);

  // Add default region handling
  useEffect(() => {
    if (!region) {
      updateRegion('IN');
    }
  }, [region, updateRegion]);

  const handleRegionChange = (event) => {
    try {
      const newRegion = event.target.value;
      updateRegion(newRegion);
      localStorage.setItem('userRegion', newRegion); // Persist the selection
    } catch (err) {
      setError('Failed to update region settings');
    }
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
      // TODO: Implement PIN setting
      setPinDialogOpen(false);
    } catch (err) {
      setError('Failed to set PIN');
    }
  };

  // Update the error check to handle initialization
  if (!region || !regionSettings[region]) {
    const defaultRegion = 'IN';
    updateRegion(defaultRegion);
    return (
      <Box>
        <Alert severity="info">
          Setting default region to India...
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper>
        <List>
          <ListItem>
            <ListItemText 
              primary="Region Settings" 
              secondary={`Current region: ${regionSettings[region].name}`} 
            />
            <ListItemSecondaryAction>
              <FormControl variant="outlined" sx={{ minWidth: 120 }}>
                <Select
                  value={region}
                  onChange={handleRegionChange}
                  size="small"
                >
                  {Object.entries(regionSettings).map(([code, data]) => (
                    <MenuItem key={code} value={code}>
                      {data.name} ({data.currency.symbol})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </ListItemSecondaryAction>
          </ListItem>

          {/* Existing Settings Items */}
          <ListItem>
            <ListItemText primary="Dark Mode" secondary="Enable dark color theme" />
            <ListItemSecondaryAction>
              <Switch
                edge="end"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
            </ListItemSecondaryAction>
          </ListItem>

          <ListItem button onClick={() => setBackupDialogOpen(true)}>
            <ListItemText 
              primary="Backup Data" 
              secondary="Create a backup of your financial data" 
            />
          </ListItem>

          <ListItem button onClick={() => setPinDialogOpen(true)}>
            <ListItemText 
              primary="Security" 
              secondary="Set up PIN protection" 
            />
          </ListItem>
        </List>
      </Paper>

      {/* Backup Dialog */}
      <Dialog open={backupDialogOpen} onClose={() => setBackupDialogOpen(false)}>
        <DialogTitle>Backup Data</DialogTitle>
        <DialogContent>
          <Typography>
            Create a backup of all your financial data. The backup will be downloaded
            as a file that you can use to restore your data later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleBackup} variant="contained">
            Create Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* PIN Dialog */}
      <Dialog open={pinDialogOpen} onClose={() => setPinDialogOpen(false)}>
        <DialogTitle>Set PIN</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="PIN"
            type="password"
            fullWidth
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPinDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSetPin} variant="contained">
            Set PIN
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Settings;