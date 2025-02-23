import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment
} from '@mui/material';

const ACCOUNT_ICONS = [
  { icon: '💰', label: 'Money Bag' },
  { icon: '💵', label: 'Dollar Note' },
  { icon: '🏦', label: 'Bank' },
  { icon: '💳', label: 'Credit Card' },
  // ... other icons
];

const AccountForm = ({ open, onClose, onSubmit, initialData, currency }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    initialBalance: 0,
    currency: currency.code,
    colorCode: '#3B82F6',
    icon: '💰',
    notes: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        type: initialData.type,
        initialBalance: initialData.initialBalance,
        currency: initialData.currency,
        colorCode: initialData.colorCode,
        icon: initialData.icon,
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'checking',
        initialBalance: 0,
        currency: currency.code,
        colorCode: '#3B82F6',
        icon: '💰',
        notes: ''
      });
    }
  }, [initialData, currency]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEnforceFocus
      keepMounted={false}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? 'Edit Account' : 'Add Account'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* ... form fields ... */}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {initialData ? 'Update' : 'Add'} Account
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AccountForm; 