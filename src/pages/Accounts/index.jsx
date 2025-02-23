/* eslint-disable react/no-unescaped-entities */
import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Snackbar,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  Tooltip,
  CircularProgress,
  Divider,
  InputAdornment,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AccountBalance,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import DatabaseService from '../../services/DatabaseService';
import { useRegion } from '../../contexts/RegionContext';
import IconSelector from '../../components/IconSelector';
import DeleteConfirmationDialog from '../../components/Dialogs/DeleteConfirmationDialog';
import { useApp } from '../../contexts/AppContext';

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

const Accounts = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currency } = useRegion();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'checking',
    initialBalance: 0,
    currentBalance: 0,
    colorCode: '#3B82F6',
    icon: '💰',
    notes: '',
    currency: currency.code
  });
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const { currentBank, currentYear } = useApp();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      
      const [accountsData, transactionsData] = await Promise.all([
        DatabaseService.getAccounts(bankId, year),
        DatabaseService.getTransactions(bankId, year)
      ]);
      
      await DatabaseService.recalculateAccountBalances(bankId, year);
      const updatedAccounts = await DatabaseService.getAccounts(bankId, year);

      setAccounts(updatedAccounts);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentBank, currentYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      
      const accountData = {
        ...formData,
        currency: currency.code
      };
      
      if (selectedAccount) {
        await DatabaseService.updateAccount(bankId, year, selectedAccount.accountId, accountData);
      } else {
        await DatabaseService.createAccount(bankId, year, accountData);
      }
      
      await loadData();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving account:', error);
      setError('Failed to save account. Please try again.');
    }
  };

  const handleDelete = async (account) => {
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      
      if (account.isDefault) {
        setError("Cannot delete default accounts");
        return;
      }

      const transactions = await DatabaseService.getTransactions(bankId, year);
      const accountTransactions = transactions.filter(tx => 
        tx.fromAccountId === account.accountId || 
        tx.toAccountId === account.accountId
      );
      
      if (accountTransactions.length > 0) {
        setError(
          `Cannot delete account "${account.name}" because it has ${accountTransactions.length} ` +
          `transaction${accountTransactions.length === 1 ? '' : 's'}. ` +
          'Please delete the transactions first.'
        );
        return;
      }

      setAccountToDelete(account);
      setConfirmDialog(true);

    } catch (error) {
      console.error('Error checking account:', error);
      setError('Failed to check account transactions. Please try again.');
    }
  };

  const handleConfirmDelete = async () => {
    try {
      if (!accountToDelete) return;

      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      
      await DatabaseService.deleteAccount(bankId, year, accountToDelete.accountId);
      await loadData();
      setConfirmDialog(false);
      setAccountToDelete(null);
      setError(null);
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error.message || 'Failed to delete account. Please try again.');
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
        colorCode: account.colorCode,
        icon: account.icon,
        notes: account.notes || '',
        currency: currency.code
      });
    } else {
      setSelectedAccount(null);
      setFormData({
        name: '',
        type: 'checking',
        initialBalance: 0,
        currentBalance: 0,
        colorCode: '#3B82F6',
        icon: '💰',
        notes: '',
        currency: currency.code
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
      colorCode: '#3B82F6',
      icon: '💰',
      notes: '',
      currency: currency.code
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(currency.locale || 'en-US', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const isDeleteDisabled = (account) => {
    return account.isDefault;
  };

  const refreshBalances = async () => {
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      
      await DatabaseService.recalculateAccountBalances(bankId, year);
      
      const accountsData = await DatabaseService.getAccounts(bankId, year);
      setAccounts(accountsData);
    } catch (error) {
      setError('Failed to refresh account balances');
    }
  };

  const accountBalances = useMemo(() => {
    if (!accounts || !transactions) return new Map();

    const balances = new Map(accounts.map(account => [
      account.accountId,
      { current: account.currentBalance, available: account.currentBalance }
    ]));

    transactions
      .filter(t => t.date > new Date().toISOString())
      .forEach(transaction => {
        const balance = balances.get(transaction.accountId);
        if (balance) {
          balance.available += transaction.type === 'expense' ? 
            -Math.abs(transaction.amount) : transaction.amount;
        }
      });

    return balances;
  }, [accounts, transactions]);

  const handleBulkUpdate = async (accountUpdates) => {
    try {
      setLoading(true);
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      for (let i = 0; i < accountUpdates.length; i += 5) {
        const batch = accountUpdates.slice(i, i + 5);
        await Promise.all(batch.map(update => 
          DatabaseService.updateAccount(bankId, year, update.accountId, update.data)
        ));
      }

      await loadData();
    } catch (error) {
      setError('Failed to update accounts');
    } finally {
      setLoading(false);
    }
  };

  const accountSummary = useMemo(() => {
    return accounts.reduce((summary, account) => {
      summary.totalBalance += account.currentBalance;
      if (account.type === 'checking' || account.type === 'savings') {
        summary.liquidAssets += account.currentBalance;
      }
      return summary;
    }, { totalBalance: 0, liquidAssets: 0 });
  }, [accounts]);

  const accountTransactions = useMemo(() => {
    if (!transactions || !accounts) return new Map();

    const summary = new Map();
    accounts.forEach(account => {
      summary.set(account.accountId, {
        income: 0,
        expenses: 0,
        transfers: 0
      });
    });

    transactions.forEach(transaction => {
      const accountSummary = summary.get(transaction.accountId);
      if (accountSummary) {
        if (transaction.type === 'income') {
          accountSummary.income += Math.abs(transaction.amount);
        } else if (transaction.type === 'expense') {
          accountSummary.expenses += Math.abs(transaction.amount);
        } else if (transaction.type === 'transfer') {
          accountSummary.transfers += Math.abs(transaction.amount);
        }
      }
    });

    return summary;
  }, [transactions, accounts]);

  return (
    <Box
      id="main-content"
      component="main"
      tabIndex={-1}
      sx={{
        outline: 'none',
        minHeight: '100vh',
        p: 3
      }}
    >
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                Accounts
              </Typography>
              <Typography color="text.secondary" variant="body1">
                Manage your financial accounts and track balances
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2}
                justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
              >
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={refreshBalances}
                  disabled={loading}
                >
                  Refresh Balances
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                  disabled={loading}
                >
                  Add Account
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        <Card sx={{ mb: 4, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Total Balance
                </Typography>
                <Typography variant="h3" component="div" fontWeight="bold">
                  {formatCurrency(accounts.reduce((sum, acc) => sum + acc.currentBalance, 0))}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                  Across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  justifyContent: { xs: 'flex-start', md: 'flex-end' } 
                }}>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Account List</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              size="small"
            >
              Add Account
            </Button>
          </Box>
          <Divider />
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={32} />
              <Typography sx={{ mt: 2 }} color="text.secondary">
                Loading accounts...
              </Typography>
            </Box>
          ) : accounts.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No accounts found. Click "Add Account" to create one.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1} sx={{ p: 2 }}>
              {accounts.map((account) => (
                <Card
                  key={account.accountId}
                  sx={{
                    p: 2,
                    boxShadow: 'none',
                    bgcolor: 'background.default',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: account.colorCode || 'primary.main',
                        color: 'white',
                        fontSize: '1.5rem'
                      }}
                    >
                      {account.icon}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {account.name}
                        </Typography>
                        {account.isDefault && (
                          <Chip
                            label="Default"
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 500,
                          color: account.currentBalance >= 0 ? 'success.main' : 'error.main'
                        }}
                      >
                        {formatCurrency(account.currentBalance)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Initial: {formatCurrency(account.initialBalance)}
                      </Typography>
                    </Box>
                    <Box>
                      <Tooltip title="Edit Account">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(account)}
                          aria-label={`Edit ${account.name}`}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip 
                        title={account.isDefault ? 'Default accounts cannot be deleted' : 'Delete Account'}
                      >
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(account)}
                            disabled={isDeleteDisabled(account)}
                            aria-label={
                              account.isDefault 
                                ? 'Cannot delete default account' 
                                : `Delete ${account.name}`
                            }
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                </Card>
              ))}
            </Stack>
          )}
        </Card>

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
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
          aria-labelledby="account-dialog-title"
          disableEscapeKeyDown
          keepMounted={false}
        >
          <form onSubmit={handleSubmit}>
            <DialogTitle id="account-dialog-title">
              {selectedAccount ? 'Edit Account' : 'Add New Account'}
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Account Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Account Type</InputLabel>
                    <Select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      label="Account Type"
                      required
                    >
                      <MenuItem value="checking">Checking</MenuItem>
                      <MenuItem value="savings">Savings</MenuItem>
                      <MenuItem value="credit">Credit Card</MenuItem>
                      <MenuItem value="investment">Investment</MenuItem>
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Initial Balance"
                    type="number"
                    value={formData.initialBalance}
                    onChange={(e) => setFormData({
                      ...formData,
                      initialBalance: Number(e.target.value),
                      currentBalance: selectedAccount ? formData.currentBalance : Number(e.target.value)
                    })}
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
                  <IconSelector
                    value={formData.icon}
                    onChange={(icon) => setFormData({ ...formData, icon })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Color"
                    type="color"
                    value={formData.colorCode}
                    onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
                    sx={{
                      '& input': {
                        height: 56,
                        padding: 1,
                        width: '100%'
                      }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </Grid>
              </Grid>

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button 
                type="submit" 
                variant="contained"
                disabled={!formData.name.trim()}
              >
                {selectedAccount ? 'Update' : 'Create'} Account
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        <DeleteConfirmationDialog
          open={confirmDialog}
          onClose={() => setConfirmDialog(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Account"
          message="Are you sure you want to delete this account? This action cannot be undone."
          item={accountToDelete}
        />
      </Container>
    </Box>
  );
};

export default Accounts;