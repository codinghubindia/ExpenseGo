import React, { createContext, useContext, useState, useEffect } from 'react';
import DatabaseService from '../services/DatabaseService';
import BackupService from '../services/BackupService';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentBank, setCurrentBank] = useState(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      await DatabaseService.initializeDatabase();

      // Check for pending restore
      const backupContent = sessionStorage.getItem('backupContent');
      const backupFormat = sessionStorage.getItem('backupFormat');
      const restoreInProgress = sessionStorage.getItem('restoreInProgress');

      if (backupContent && restoreInProgress) {
        try {
          // Clear restore flags first
          sessionStorage.removeItem('backupContent');
          sessionStorage.removeItem('backupFormat');
          sessionStorage.removeItem('restoreInProgress');

          // Parse and process backup data
          let backupData;
          if (backupFormat === 'ENCRYPTED') {
            const decrypted = BackupService.decryptData(backupContent);
            backupData = JSON.parse(decrypted);
          } else {
            backupData = JSON.parse(backupContent);
          }

          // Restore the data
          await BackupService.restoreBackup(backupData);

          // Set success flag and force a final reload
          sessionStorage.setItem('restoreComplete', 'true');
          window.location.href = window.location.href.split('#')[0];
          return;
        } catch (error) {
          console.error('Restore failed:', error);
          setError('Failed to restore backup: ' + error.message);
        }
      }

      // Check if restore was just completed
      const restoreComplete = sessionStorage.getItem('restoreComplete');
      if (restoreComplete) {
        sessionStorage.removeItem('restoreComplete');
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
    }
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 