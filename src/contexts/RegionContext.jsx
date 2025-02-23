/* eslint-disable react/prop-types */
import React, { createContext, useContext, useState, useEffect } from 'react';

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

const RegionContext = createContext();

export const RegionProvider = ({ children }) => {
  const [currency] = useState({
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    locale: 'en-IN'
  });

  return (
    <RegionContext.Provider value={{ currency }}>
      {children}
    </RegionContext.Provider>
  );
};

export const useRegion = () => useContext(RegionContext);