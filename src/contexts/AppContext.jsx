import React, { createContext, useContext, useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import DatabaseService from '../services/DatabaseService';
import BackupService from '../services/BackupService';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBank, setCurrentBank] = useState(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [currency, setCurrency] = useState({
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee'
  });

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setSuccessMessage('');
  };

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await DatabaseService.initializeDatabase();

      // First check localStorage for backup data (for PWA)
      const backupContent = localStorage.getItem('backupContent');
      const backupFormat = localStorage.getItem('backupFormat');
      const restoreInProgress = localStorage.getItem('restoreInProgress');
      const restoreFileName = localStorage.getItem('restoreFileName');

      // If no data in localStorage, check sessionStorage (for browser)
      const sessionBackupContent = sessionStorage.getItem('backupContent');
      const sessionBackupFormat = sessionStorage.getItem('backupFormat');
      const sessionRestoreInProgress = sessionStorage.getItem('restoreInProgress');
      const sessionRestoreFileName = sessionStorage.getItem('restoreFileName');

      if ((backupContent && restoreInProgress) || (sessionBackupContent && sessionRestoreInProgress)) {
        try {
          // Clear restore flags first
          localStorage.removeItem('backupContent');
          localStorage.removeItem('backupFormat');
          localStorage.removeItem('restoreInProgress');
          sessionStorage.removeItem('backupContent');
          sessionStorage.removeItem('backupFormat');
          sessionStorage.removeItem('restoreInProgress');

          // Parse and process backup data
          let backupData;
          if (backupFormat === 'ENCRYPTED' || sessionBackupFormat === 'ENCRYPTED') {
            const decrypted = BackupService.decryptData(backupContent || sessionBackupContent);
            backupData = JSON.parse(decrypted);
          } else {
            backupData = JSON.parse(backupContent || sessionBackupContent);
          }

          // Restore the data
          await BackupService.restoreBackup(backupData);

          // Set success flag in both storages with filename
          const fileName = restoreFileName || sessionRestoreFileName || 'backup';
          localStorage.setItem('restoreComplete', 'true');
          localStorage.setItem('restoreSuccess', `Successfully restored data from ${fileName}`);
          sessionStorage.setItem('restoreComplete', 'true');
          sessionStorage.setItem('restoreSuccess', `Successfully restored data from ${fileName}`);
          
          // Force a final reload
          window.location.reload();
          return;
        } catch (error) {
          console.error('Restore failed:', error);
          setError('Failed to restore backup: ' + error.message);
        }
      }

      // Check if restore was just completed
      const restoreComplete = localStorage.getItem('restoreComplete') || 
                            sessionStorage.getItem('restoreComplete');
      const restoreSuccess = localStorage.getItem('restoreSuccess') || 
                            sessionStorage.getItem('restoreSuccess');
                          
      if (restoreComplete) {
        // Show success message if exists
        if (restoreSuccess) {
          setSuccessMessage(restoreSuccess);
          setShowSuccess(true);
        }
        
        // Clear all flags
        localStorage.removeItem('restoreComplete');
        localStorage.removeItem('restoreSuccess');
        localStorage.removeItem('restoreFileName');
        sessionStorage.removeItem('restoreComplete');
        sessionStorage.removeItem('restoreSuccess');
        sessionStorage.removeItem('restoreFileName');
      }

      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const value = {
    isLoading,
    error,
    currentBank,
    setCurrentBank,
    currentYear,
    setCurrentYear,
    theme,
    setTheme: (newTheme) => {
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
    },
    currency,
    setCurrency: (newCurrency) => {
      setCurrency(newCurrency);
    }
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSuccess}
          severity="success"
          variant="filled"
          elevation={6}
          sx={{ 
            width: '100%',
            backgroundColor: 'success.main',
            color: 'white',
            '& .MuiAlert-icon': {
              color: 'white'
            },
            fontSize: '1rem',
            alignItems: 'center'
          }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 