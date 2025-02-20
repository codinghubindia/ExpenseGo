import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const TransactionForm = ({ open, onClose, onSubmit, accounts, categories, initialData = null }) => {
  const [formData, setFormData] = useState({
    accountId: '',
    toAccountId: '',
    categoryId: '',
    type: 'expense',
    amount: '',
    date: dayjs(),
    description: '',
    paymentMethod: '',
    location: '',
    isRecurring: false
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        date: dayjs(initialData.date),
        amount: Math.abs(initialData.amount)
      });
    } else {
      // Reset form when opening for new transaction
      setFormData({
        accountId: '',
        toAccountId: '',
        categoryId: '',
        type: 'expense',
        amount: '',
        date: dayjs(),
        description: '',
        paymentMethod: '',
        location: '',
        isRecurring: false
      });
    }
  }, [initialData, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      accountId: '',
      toAccountId: '',
      categoryId: '',
      type: 'expense',
      amount: '',
      date: dayjs(),
      description: '',
      paymentMethod: '',
      location: '',
      isRecurring: false
    });
    onClose();
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(category => 
      formData.type !== 'transfer' && category.type === formData.type
    );
  }, [categories, formData.type]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialData ? 'Edit Transaction' : 'New Transaction'}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
            >
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="income">Income</MenuItem>
              <MenuItem value="transfer">Transfer</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel>{formData.type === 'transfer' ? 'From Account' : 'Account'}</InputLabel>
            <Select
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              required
            >
              {accounts.map((account) => (
                <MenuItem key={account.accountId} value={account.accountId}>
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {formData.type === 'transfer' && (
            <FormControl fullWidth margin="dense">
              <InputLabel>To Account</InputLabel>
              <Select
                value={formData.toAccountId}
                onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
                required
              >
                {accounts
                  .filter(account => account.accountId !== formData.accountId)
                  .map((account) => (
                    <MenuItem key={account.accountId} value={account.accountId}>
                      <span style={{ marginRight: '8px' }}>{account.icon}</span>
                      {account.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}

          {formData.type !== 'transfer' && (
            <FormControl fullWidth margin="dense">
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                required
              >
                {filteredCategories.map((category) => (
                  <MenuItem key={category.categoryId} value={category.categoryId}>
                    <span style={{ marginRight: '8px' }}>{category.icon}</span>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            margin="dense"
            label="Amount"
            type="number"
            fullWidth
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            inputProps={{ step: "0.01" }}
          />

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date"
              value={formData.date}
              onChange={(newValue) => setFormData({ ...formData, date: newValue })}
              slotProps={{ textField: { margin: 'dense', fullWidth: true } }}
            />
          </LocalizationProvider>

          <TextField
            margin="dense"
            label="Description"
            fullWidth
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <TextField
            margin="dense"
            label="Payment Method"
            fullWidth
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
          />

          <TextField
            margin="dense"
            label="Location"
            fullWidth
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.isRecurring}
                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              />
            }
            label="Recurring Transaction"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            {initialData ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TransactionForm; 