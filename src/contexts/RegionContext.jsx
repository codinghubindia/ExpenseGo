/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useEffect } from 'react';

export const regionSettings = {
  'IN': { 
    name: 'India',
    currency: {
      symbol: '₹',
      code: 'INR'
    }
  },
  'US': {
    name: 'United States',
    currency: {
      symbol: '$',
      code: 'USD'
    }
  },
  'EU': {
    name: 'European Union',
    currency: {
      symbol: '€',
      code: 'EUR'
    }
  },
  'GB': {
    name: 'United Kingdom',
    currency: {
      symbol: '£',
      code: 'GBP'
    }
  }
};

const RegionContext = createContext(undefined);

export function RegionProvider({ children }) {
  // Change default region to 'IN' (India)
  const [region, setRegion] = useState('IN');
  const [currency, setCurrency] = useState(regionSettings['IN'].currency);

  const updateRegion = (newRegion) => {
    setRegion(newRegion);
    setCurrency(regionSettings[newRegion].currency);
    localStorage.setItem('userRegion', newRegion);
  };

  useEffect(() => {
    // Load saved region or use India as default
    const savedRegion = localStorage.getItem('userRegion') || 'IN';
    if (regionSettings[savedRegion]) {
      setRegion(savedRegion);
      setCurrency(regionSettings[savedRegion].currency);
    }
  }, []);

  return (
    <RegionContext.Provider value={{ region, currency, updateRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

export const useRegion = () => {
  const context = useContext(RegionContext);
  if (context === undefined) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
};