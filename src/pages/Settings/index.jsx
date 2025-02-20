import { useState } from 'react';
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
  TextField
} from '@mui/material';
import DatabaseService from '../../services/DatabaseService';

function Settings() {
  const [darkMode, setDarkMode] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);

  const handleBackup = async () => {
    // TODO: Implement backup functionality
    setBackupDialogOpen(false);
  };

  const handleSetPin = async () => {
    // TODO: Implement PIN setting
    setPinDialogOpen(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper>
        <List>
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