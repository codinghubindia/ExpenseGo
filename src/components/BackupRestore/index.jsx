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
import { useApp } from '../../contexts/AppContext';

const BackupRestore = () => {
  const { setIsLoading } = useApp();
  const [format, setFormat] = useState('DEFAULT');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Check if running as installed PWA
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;

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
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Validate file size and format
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size too large. Maximum size is 10MB.');
      }

      const extension = file.name.split('.').pop().toLowerCase();
      const format = Object.entries(BackupService.BACKUP_FORMATS)
        .find(([_, value]) => value.extension === extension)?.[0];

      if (!format) {
        throw new Error('Invalid backup file format. Please use a valid ExpenseGo backup file.');
      }

      // Check for existing data
      const hasData = await DatabaseService.hasExistingData();
      if (hasData) {
        const shouldProceed = window.confirm(
          'This will replace all existing data with the backup data. Are you sure you want to proceed?'
        );
        if (!shouldProceed) {
          setLoading(false);
          return;
        }
      }

      // Read the file content
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backupData = e.target.result;

          // Always store in localStorage for PWA support
          localStorage.setItem('backupContent', backupData);
          localStorage.setItem('backupFormat', format);
          localStorage.setItem('restoreInProgress', 'true');
          localStorage.setItem('restoreFileName', file.name);

          // Also store in sessionStorage for browser support
          try {
            sessionStorage.setItem('backupContent', backupData);
            sessionStorage.setItem('backupFormat', format);
            sessionStorage.setItem('restoreInProgress', 'true');
            sessionStorage.setItem('restoreFileName', file.name);
          } catch (e) {
            console.warn('SessionStorage not available:', e);
          }

          window.location.reload(true);

          // Clear existing data
          await BackupService.clearAllAppData();

          // Force a complete page reload
          window.location.href = window.location.origin + window.location.pathname;
        } catch (error) {
          setError('Failed to process backup file: ' + error.message);
          localStorage.removeItem('restoreInProgress');
          localStorage.removeItem('restoreFileName');
          sessionStorage.removeItem('restoreInProgress');
          sessionStorage.removeItem('restoreFileName');
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read backup file');
        setLoading(false);
      };

      reader.readAsText(file);

    } catch (error) {
      setError('Failed to restore backup: ' + error.message);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    
    // Check restore completion in both storages
    const restoreComplete = sessionStorage.getItem('restoreComplete') || 
                           localStorage.getItem('restoreComplete');
                         
    if (restoreComplete) {
      // Clear flags from both storages
      sessionStorage.removeItem('restoreComplete');
      localStorage.removeItem('restoreComplete');
      sessionStorage.removeItem('backupContent');
      localStorage.removeItem('backupContent');
      sessionStorage.removeItem('backupFormat');
      localStorage.removeItem('backupFormat');
      sessionStorage.removeItem('restoreInProgress');
      localStorage.removeItem('restoreInProgress');
      
      // Reload the page
      window.location.reload();
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

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm" 
        fullWidth
      >
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
            <Stack 
              spacing={2} 
              sx={{ 
                '& > div:first-of-type': {
                  marginTop: 0
                }
              }}
            >
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
            </Stack>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>
              Restore
            </Typography>
            <Stack 
              spacing={2} 
              sx={{ 
                '& > div:first-of-type': {
                  marginTop: 0
                }
              }}
            >
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
            </Stack>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BackupRestore;