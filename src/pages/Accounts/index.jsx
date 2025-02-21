/* eslint-disable react/no-unescaped-entities */
import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import DatabaseService from '../../services/DatabaseService';

// Add this constant at the top of your file after imports
const ACCOUNT_ICONS = [
  { icon: '💰', label: 'Money Bag' },
  { icon: '💵', label: 'Dollar Note' },
  { icon: '🏦', label: 'Bank' },
  { icon: '💳', label: 'Credit Card' },
  { icon: '🏧', label: 'ATM' },
  { icon: '💴', label: 'Yen Note' },
  { icon: '💶', label: 'Euro Note' },
  { icon: '💷', label: 'Pound Note' },
  { icon: '🪙', label: 'Coin' },
  { icon: '📈', label: 'Investment' },
  { icon: '🏠', label: 'Home' },
  { icon: '🚗', label: 'Car' },
  { icon: '✈️', label: 'Travel' },
  { icon: '🎯', label: 'Goal' },
  { icon: '🎓', label: 'Education' }
];

// Replace the icon TextField with this IconSelector component
const IconSelector = ({ value, onChange }) => (
  <FormControl fullWidth margin="dense">
    <InputLabel>Icon</InputLabel>
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      renderValue={(selected) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: '1.5rem' }}>{selected}</span>
          <Typography variant="body2">
            {ACCOUNT_ICONS.find(item => item.icon === selected)?.label || 'Custom Icon'}
          </Typography>
        </Box>
      )}
    >
      {ACCOUNT_ICONS.map((item) => (
        <MenuItem key={item.icon} value={item.icon}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
            <Typography>{item.label}</Typography>
          </Box>
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    initialBalance: 0,
    currentBalance: 0,
    currency: 'USD',
    colorCode: '#000000',
    icon: '💰',
    notes: ''
  });
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      await DatabaseService.initializeDatabase(); // Ensure DB is initialized
      const bankId = 1; // TODO: Get from context
      const year = new Date().getFullYear();
      const data = await DatabaseService.getAccounts(bankId, year);
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
      // TODO: Show error notification
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const bankId = 1; // TODO: Get from context
      const year = new Date().getFullYear();
      
      if (selectedAccount) {
        await DatabaseService.updateAccount(bankId, year, selectedAccount.accountId, formData);
      } else {
        await DatabaseService.createAccount(bankId, year, formData);
      }
      
      await loadAccounts();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving account:', error);
      // TODO: Show error notification
    }
  };

  // Update the handleDelete function
  const handleDelete = async (account) => {
    try {
      const bankId = 1;
      const year = new Date().getFullYear();
      
      // First check if it's a default account
      if (account.isDefault) {
        setError(`Cannot delete "${account.name}" because it's a default account that is required for the system to work properly.`);
        return;
      }
      
      // Then check for transactions
      const transactions = await DatabaseService.getTransactionsByAccount(bankId, year, account.accountId);
      
      if (transactions && transactions.length > 0) {
        setError(
          `Cannot delete account "${account.name}" because it has ${transactions.length} ` +
          `transaction${transactions.length === 1 ? '' : 's'}. ` +
          'Please move or delete the transactions first.'
        );
        return;
      }

      setAccountToDelete(account);
      setConfirmDialog(true);
    } catch (error) {
      console.error('Error checking account:', error);
      setError('Failed to process account deletion request. Please try again.');
    }
  };

  // Update the handleConfirmDelete function
  const handleConfirmDelete = async () => {
    try {
      const bankId = 1;
      const year = new Date().getFullYear();
      
      await DatabaseService.deleteAccount(bankId, year, accountToDelete.accountId);
      await loadAccounts();
      setConfirmDialog(false);
      setAccountToDelete(null);
      setError(null);
    } catch (error) {
      console.error('Error deleting account:', error);
      if (error.message.includes('default account')) {
        setError(
          `Cannot delete "${accountToDelete.name}" as it's a protected default account. ` +
          'Default accounts are required for the system to work properly.'
        );
      } else {
        setError('Failed to delete account. Please try again.');
      }
    }
  };

  const handleOpenDialog = (account = null) => {
    if (account) {
      setSelectedAccount(account);
      setFormData({
        name: account.name,
        type: account.type,
        initialBalance: account.initialBalance,
        currentBalance: account.currentBalance,
        currency: account.currency,
        colorCode: account.colorCode,
        icon: account.icon,
        notes: account.notes || ''
      });
    } else {
      setSelectedAccount(null);
      setFormData({
        name: '',
        type: 'checking',
        initialBalance: 0,
        currentBalance: 0,
        currency: 'USD',
        colorCode: '#000000',
        icon: '💰',
        notes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedAccount(null);
    setFormData({
      name: '',
      type: 'checking',
      initialBalance: 0,
      currentBalance: 0,
      currency: 'USD',
      colorCode: '#000000',
      icon: '💰',
      notes: ''
    });
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Add a helper function to determine if delete button should be disabled
  const isDeleteDisabled = (account) => {
    return account.isDefault;
  };

  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Accounts</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Account
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Icon</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Initial Balance</TableCell>
              <TableCell align="right">Current Balance</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Loading accounts...
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No accounts found. Click "Add Account" to create one.
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.accountId}>
                  <TableCell>
                    <span style={{ fontSize: '1.5rem' }}>{account.icon}</span>
                  </TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.type}</TableCell>
                  <TableCell align="right">
                    {formatCurrency(account.initialBalance, account.currency)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(account.currentBalance, account.currency)}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(account)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(account)}
                      disabled={isDeleteDisabled(account)}
                      title={account.isDefault ? 'Default accounts cannot be deleted' : 'Delete account'}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {selectedAccount ? 'Edit Account' : 'New Account'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Account Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                <MenuItem value="checking">Checking</MenuItem>
                <MenuItem value="savings">Savings</MenuItem>
                <MenuItem value="credit">Credit Card</MenuItem>
                <MenuItem value="investment">Investment</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Initial Balance"
              type="number"
              fullWidth
              value={formData.initialBalance}
              onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) })}
              required
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                required
              >
                <MenuItem value="USD">USD - US Dollar</MenuItem>
                <MenuItem value="INR">INR - Indian Rupee</MenuItem>
                <MenuItem value="EUR">EUR - Euro</MenuItem>
                <MenuItem value="GBP">GBP - British Pound</MenuItem>
                <MenuItem value="JPY">JPY - Japanese Yen</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Color"
              type="color"
              fullWidth
              value={formData.colorCode}
              onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
            />
            <IconSelector
              value={formData.icon}
              onChange={(newIcon) => setFormData({ ...formData, icon: newIcon })}
            />
            <TextField
              margin="dense"
              label="Notes"
              fullWidth
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {selectedAccount ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar 
        open={Boolean(error)} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setError(null)} 
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete account "{accountToDelete?.name}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Accounts;