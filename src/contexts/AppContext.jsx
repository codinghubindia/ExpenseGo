import React, { createContext, useContext, useState, useEffect } from 'react';
import DatabaseService from '../services/DatabaseService';

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
      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const value = {
    isLoading,
    error,
    currentBank,
    setCurrentBank,
    currentYear,
    setCurrentYear,
    theme,
    setTheme: handleThemeChange
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