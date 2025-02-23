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
  InputAdornment,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

// Add payment method options
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'check', label: 'Check' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'wallet', label: 'Digital Wallet' },
  { value: 'other', label: 'Other' }
];

const TransactionForm = ({ 
  open, 
  onClose, 
  onSubmit, 
  accounts, 
  categories,
  initialData,
  currency 
}) => {
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    date: dayjs(),
    accountId: '',
    toAccountId: '',
    categoryId: '',
    description: '',
    paymentMethod: 'cash'
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        type: initialData.type,
        amount: Math.abs(initialData.amount),
        date: dayjs(initialData.date),
        accountId: initialData.accountId,
        toAccountId: initialData.toAccountId || '',
        categoryId: initialData.categoryId || '',
        description: initialData.description || '',
        paymentMethod: initialData.paymentMethod || 'cash'
      });
    } else {
      // Reset form with default values
      setFormData({
        type: 'expense',
        amount: '',
        date: dayjs(),
        accountId: accounts[0]?.accountId || '',
        toAccountId: '',
        categoryId: '',
        description: '',
        paymentMethod: 'cash'
      });
    }
  }, [initialData, accounts, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      if (!formData.accountId) {
        throw new Error('Please select an account');
      }
      if (!formData.amount || formData.amount <= 0) {
        throw new Error('Please enter a valid amount');
      }
      if (formData.type === 'transfer' && !formData.toAccountId) {
        throw new Error('Please select a destination account');
      }
      if (formData.type !== 'transfer' && !formData.categoryId) {
        throw new Error('Please select a category');
      }
      if (!formData.description) {
        throw new Error('Please enter a description');
      }

      const processedData = {
        ...formData,
        amount: formData.type === 'expense' ? -Math.abs(Number(formData.amount)) : Number(formData.amount),
        date: formData.date.toISOString()
      };

      onSubmit(processedData);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredCategories = categories.filter(
    category => category.type === formData.type
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {initialData ? 'Edit Transaction' : 'New Transaction'}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      type: e.target.value,
                      categoryId: ''
                    })}
                    label="Type"
                  >
                    <MenuItem value="expense">Expense</MenuItem>
                    <MenuItem value="income">Income</MenuItem>
                    <MenuItem value="transfer">Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>{formData.type === 'transfer' ? 'From Account' : 'Account'}</InputLabel>
                  <Select
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    label={formData.type === 'transfer' ? 'From Account' : 'Account'}
                  >
                    {accounts.map(account => (
                      <MenuItem key={account.accountId} value={account.accountId}>
                        {account.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {formData.type === 'transfer' ? (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>To Account</InputLabel>
                    <Select
                      value={formData.toAccountId}
                      onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
                      label="To Account"
                    >
                      {accounts
                        .filter(account => account.accountId !== formData.accountId)
                        .map(account => (
                          <MenuItem key={account.accountId} value={account.accountId}>
                            {account.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </Grid>
              ) : (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      label="Category"
                    >
                      {filteredCategories.map(category => (
                        <MenuItem key={category.categoryId} value={category.categoryId}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {currency.symbol}
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={(newDate) => setFormData({ ...formData, date: newDate })}
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      required: true 
                    } 
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    label="Payment Method"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <MenuItem key={method.value} value={method.value}>
                        {method.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained">
              {initialData ? 'Update' : 'Add'} Transaction
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
};

export default TransactionForm; 