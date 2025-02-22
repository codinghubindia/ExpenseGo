import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import { 
  Backup as BackupIcon,
  Restore as RestoreIcon 
} from '@mui/icons-material';
import BackupService from '../../services/BackupService';
import DatabaseService from '../../services/DatabaseService';

const BackupRestore = () => {
  const [format, setFormat] = useState('DEFAULT');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleFormatChange = (event) => {
    setFormat(event.target.value);
  };

  const getAcceptedFileTypes = () => {
    return Object.values(BackupService.BACKUP_FORMATS)
      .map(format => `.${format.extension}`)
      .join(',');
  };

  const handleBackup = async () => {
    try {
      setLoading(true);
      setError(null);
      await BackupService.downloadBackup(format);
      setSuccess('Backup created and downloaded successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (event) => {
    try {
      setLoading(true);
      setError(null);
      const file = event.target.files[0];
      if (!file) return;

      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size too large. Maximum size is 10MB.');
      }

      const extension = file.name.split('.').pop().toLowerCase();
      const isValidExtension = Object.values(BackupService.BACKUP_FORMATS)
        .some(format => format.extension === extension);

      if (!isValidExtension) {
        throw new Error('Invalid backup file format. Please use a valid ExpenseGo backup file.');
      }

      await BackupService.restoreBackup(file);
      
      // Force reload of app data
      await DatabaseService.initializeDatabase();
      
      setSuccess('Data restored successfully! The page will refresh.');
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setError('Failed to restore backup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<BackupIcon />}
        onClick={() => setOpen(true)}
      >
        Backup & Restore
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Backup and Restore</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Backup
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Backup Format</InputLabel>
                <Select
                  value={format}
                  onChange={handleFormatChange}
                  label="Backup Format"
                >
                  {Object.entries(BackupService.BACKUP_FORMATS).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value.description}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                onClick={handleBackup}
                startIcon={<BackupIcon />}
                disabled={loading}
              >
                Create Backup
              </Button>
            </Box>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Restore
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Restore your data from a previous backup file.
                Supported formats: {Object.values(BackupService.BACKUP_FORMATS)
                  .map(format => format.description)
                  .join(', ')}
              </Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<RestoreIcon />}
                disabled={loading}
              >
                Restore Backup
                <input
                  type="file"
                  hidden
                  accept={getAcceptedFileTypes()}
                  onChange={handleRestore}
                />
              </Button>
            </Box>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BackupRestore;