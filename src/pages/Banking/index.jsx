import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  IconButton,
  Stack,
  Button,
  useTheme,
  Container,
  Chip,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Divider,
  Menu,
  MenuItem,
  Avatar,
  LinearProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Collapse,
  Alert,
  Snackbar,
  Popover,
  ListItemIcon,
  ListItemText,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  MoreVert,
  AccountBalance,
  ArrowUpward,
  ArrowDownward,
  CompareArrows,
  TrendingUp,
  TrendingDown,
  Payment,
  Download,
  Upload,
  Sort,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Receipt,
  Category as CategoryIcon,
  AccountBalance as AccountIcon,
  CalendarToday,
  LocationOn,
  Notes,
  MoreHoriz
} from '@mui/icons-material';
import { useApp } from '../../contexts/AppContext';
import { useRegion } from '../../contexts/RegionContext';
import DatabaseService from '../../services/DatabaseService';
import dayjs from 'dayjs';
import TransactionForm from '../../components/Forms/TransactionForm';
import AccountForm from '../../components/Forms/AccountForm';
import DeleteConfirmationDialog from '../../components/Dialogs/DeleteConfirmationDialog';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

const Banking = () => {
  const theme = useTheme();
  const { currentBank, currentYear } = useApp();
  const { currency } = useRegion();
  const [activeTab, setActiveTab] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactionForm, setTransactionForm] = useState({
    open: false,
    mode: 'add',
    data: null,
    loading: false,
    error: null
  });
  const [categories, setCategories] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [accountMetrics, setAccountMetrics] = useState({});
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [sortBy, setSortBy] = useState('date');
  const [accountForm, setAccountForm] = useState({
    open: false,
    mode: 'add',
    data: null,
    loading: false,
    error: null
  });
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [accountDeleteDialog, setAccountDeleteDialog] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  const [advancedFilters, setAdvancedFilters] = useState({
    dateRange: { start: null, end: null },
    amountRange: { min: '', max: '' },
    categories: [],
    accounts: [],
    types: []
  });
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  // Move formatCurrency function before fetchData
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.code
    }).format(amount);
  };

  // Move these helper functions outside the component
  const sortTransactionsByField = (transactions, sortBy, sortOrder) => {
    return [...transactions].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = dayjs(b.date).valueOf() - dayjs(a.date).valueOf();
          break;
        case 'amount':
          comparison = Math.abs(b.amount) - Math.abs(a.amount);
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        default:
          comparison = dayjs(b.date).valueOf() - dayjs(a.date).valueOf();
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });
  };

  const filterTransactionsByDate = (transactions, dateRange) => {
    const now = dayjs();
    switch (dateRange) {
      case 'today':
        return transactions.filter(t => dayjs(t.date).isSame(now, 'day'));
      case 'week':
        return transactions.filter(t => dayjs(t.date).isAfter(now.subtract(1, 'week')));
      case 'month':
        return transactions.filter(t => dayjs(t.date).isSame(now, 'month'));
      case 'year':
        return transactions.filter(t => dayjs(t.date).isSame(now, 'year'));
      default:
        return transactions;
    }
  };

  // Move calculateAccountMetrics before fetchData
  const calculateAccountMetrics = useCallback((accountId, transactionsList) => {
    const accountTx = transactionsList.filter(t => 
      t.accountId === accountId || t.toAccountId === accountId
    );

    const thisMonth = dayjs().startOf('month');
    const lastMonth = thisMonth.subtract(1, 'month');

    const thisMonthTx = accountTx.filter(t => dayjs(t.date).isSame(thisMonth, 'month'));
    const lastMonthTx = accountTx.filter(t => dayjs(t.date).isSame(lastMonth, 'month'));

    const calculateMetrics = (txs) => ({
      income: txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
      expenses: txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0),
      transfers: txs.filter(t => t.type === 'transfer').length
    });

    const thisMonthMetrics = calculateMetrics(thisMonthTx);
    const lastMonthMetrics = calculateMetrics(lastMonthTx);

    const getPercentageChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    return {
      thisMonth: thisMonthMetrics,
      lastMonth: lastMonthMetrics,
      changes: {
        income: getPercentageChange(thisMonthMetrics.income, lastMonthMetrics.income),
        expenses: getPercentageChange(thisMonthMetrics.expenses, lastMonthMetrics.expenses)
      }
    };
  }, []);

  // Then define fetchData
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      const [accountsData, transactionsData, categoriesData] = await Promise.all([
        DatabaseService.getAccounts(bankId, year),
        DatabaseService.getTransactions(bankId, year),
        DatabaseService.getCategories(bankId, year)
      ]);

      // Batch state updates
      setAccounts(accountsData);
      setTransactions(transactionsData);
      setCategories(categoriesData);

      // Calculate metrics for each account
      const metrics = {};
      accountsData.forEach(account => {
        metrics[account.accountId] = calculateAccountMetrics(account.accountId, transactionsData);
      });
      setAccountMetrics(metrics);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentBank, currentYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTotalBalance = () => {
    return accounts.reduce((sum, account) => sum + account.currentBalance, 0);
  };

  const getAccountMetrics = (accountId) => {
    const accountTransactions = transactions.filter(t => 
      t.accountId === accountId || t.toAccountId === accountId
    );

    const income = accountTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = accountTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const lastTransaction = accountTransactions
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    return { income, expenses, lastTransaction };
  };

  // Add transaction handlers
  const handleOpenTransactionForm = (mode = 'add', data = null) => {
    setTransactionForm({
      open: true,
      mode,
      data,
      loading: false,
      error: null
    });
  };

  const handleCloseTransactionForm = () => {
    setTransactionForm({
      open: false,
      mode: 'add',
      data: null,
      loading: false,
      error: null
    });
  };

  const handleTransactionSubmit = async (formData) => {
    try {
      setTransactionForm(prev => ({ ...prev, loading: true }));
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      if (transactionForm.mode === 'edit') {
        await DatabaseService.updateTransaction(
          bankId,
          year,
          transactionForm.data.transactionId,
          {
            ...formData,
            transactionId: transactionForm.data.transactionId
          }
        );
        handleSnackbar('Transaction updated successfully');
      } else {
        await DatabaseService.addTransaction(bankId, year, formData);
        handleSnackbar('Transaction added successfully');
      }

      handleCloseTransactionForm();
      await fetchData();
    } catch (error) {
      handleSnackbar(error.message || 'Failed to save transaction', 'error');
    } finally {
      setTransactionForm(prev => ({ ...prev, loading: false }));
    }
  };

  // Add delete handlers
  const handleDeleteClick = (transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      
      await DatabaseService.deleteTransaction(
        bankId,
        year,
        transactionToDelete.transactionId
      );

      setDeleteDialog(false);
      setTransactionToDelete(null);
      await fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  // Memoize the filter function
  const getFilteredTransactions = useCallback(() => {
    if (!transactions.length) return [];

    let filtered = [...transactions];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply advanced filters
    if (advancedFilters.dateRange.start) {
      filtered = filtered.filter(t => 
        dayjs(t.date).isAfter(advancedFilters.dateRange.start)
      );
    }
    if (advancedFilters.dateRange.end) {
      filtered = filtered.filter(t => 
        dayjs(t.date).isBefore(advancedFilters.dateRange.end)
      );
    }
    if (advancedFilters.amountRange.min) {
      filtered = filtered.filter(t => 
        Math.abs(t.amount) >= Number(advancedFilters.amountRange.min)
      );
    }
    if (advancedFilters.amountRange.max) {
      filtered = filtered.filter(t => 
        Math.abs(t.amount) <= Number(advancedFilters.amountRange.max)
      );
    }
    if (advancedFilters.categories.length) {
      filtered = filtered.filter(t => 
        advancedFilters.categories.includes(t.categoryId)
      );
    }
    if (advancedFilters.accounts.length) {
      filtered = filtered.filter(t => 
        advancedFilters.accounts.includes(t.accountId) ||
        advancedFilters.accounts.includes(t.toAccountId)
      );
    }
    if (advancedFilters.types.length) {
      filtered = filtered.filter(t => 
        advancedFilters.types.includes(t.type)
      );
    }

    // Apply existing filters...
    return sortTransactionsByField(filtered, sortBy, sortOrder);
  }, [transactions, searchQuery, advancedFilters, selectedAccount, activeTab, selectedDateRange, sortBy, sortOrder]);

  // Update filtered transactions only when necessary
  useEffect(() => {
    const newFilteredTransactions = getFilteredTransactions();
    setFilteredTransactions(newFilteredTransactions);
  }, [getFilteredTransactions]);

  // Add account management functions
  const handleOpenAccountForm = (mode = 'add', data = null) => {
    setAccountForm({
      open: true,
      mode,
      data,
      loading: false,
      error: null
    });
  };

  const handleCloseAccountForm = () => {
    setAccountForm({
      open: false,
      mode: 'add',
      data: null,
      loading: false,
      error: null
    });
  };

  const handleAccountSubmit = async (formData) => {
    try {
      setAccountForm(prev => ({ ...prev, loading: true }));
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      if (accountForm.mode === 'edit') {
        await DatabaseService.updateAccount(
          bankId,
          year,
          accountForm.data.accountId,
          {
            ...formData,
            accountId: accountForm.data.accountId
          }
        );
        handleSnackbar('Account updated successfully');
      } else {
        await DatabaseService.createAccount(bankId, year, formData);
        handleSnackbar('Account created successfully');
      }

      handleCloseAccountForm();
      await fetchData();
    } catch (error) {
      handleSnackbar(error.message || 'Failed to save account', 'error');
    } finally {
      setAccountForm(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeleteAccount = (account) => {
    setAccountToDelete(account);
    setAccountDeleteDialog(true);
  };

  const handleConfirmAccountDelete = async () => {
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      
      await DatabaseService.deleteAccount(bankId, year, accountToDelete.accountId);
      setAccountDeleteDialog(false);
      setAccountToDelete(null);
      await fetchData();
    } catch (error) {
      console.error('Error deleting account:', error);
      setAccountForm(prev => ({
        ...prev,
        error: error.message || 'Failed to delete account'
      }));
    }
  };

  // Add transaction details renderer for delete dialog
  const renderTransactionDetails = (transaction) => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {transaction.description}
      </Typography>
      <Typography variant="h6">
        {formatCurrency(Math.abs(transaction.amount))}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {dayjs(transaction.date).format('MMM D, YYYY')}
      </Typography>
    </Box>
  );

  // Add account details renderer for delete dialog
  const renderAccountDetails = (account) => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {account.name}
      </Typography>
      <Typography variant="h6">
        {formatCurrency(account.currentBalance)}
      </Typography>
    </Box>
  );

  // Add transaction details handlers
  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedTransaction(null);
  };

  // Add snackbar handler
  const handleSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Add transaction details component
  const TransactionDetails = ({ transaction }) => {
    if (!transaction) return null;

    const account = accounts.find(a => a.accountId === transaction.accountId);
    const category = categories.find(c => c.categoryId === transaction.categoryId);
    const toAccount = transaction.toAccountId ? 
      accounts.find(a => a.accountId === transaction.toAccountId) : null;

    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Transaction Details
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="h5" color={
                    transaction.type === 'income' ? 'success.main' :
                    transaction.type === 'expense' ? 'error.main' : 'info.main'
                  }>
                    {transaction.type === 'expense' ? '-' : ''}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Date
                  </Typography>
                  <Typography>
                    {dayjs(transaction.date).format('MMM D, YYYY')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Account
                  </Typography>
                  <Typography>{account?.name}</Typography>
                </Box>
                {toAccount && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      To Account
                    </Typography>
                    <Typography>{toAccount.name}</Typography>
                  </Box>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Category
                  </Typography>
                  <Typography>{category?.name}</Typography>
                </Box>
                {transaction.location && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Location
                    </Typography>
                    <Typography>{transaction.location}</Typography>
                  </Box>
                )}
                {transaction.notes && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography>{transaction.notes}</Typography>
                  </Box>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Update the transaction list section
  const renderTransactionList = () => (
    <Box>
      {filteredTransactions.map((transaction) => {
        const account = accounts.find(a => a.accountId === transaction.accountId);
        const category = categories.find(c => c.categoryId === transaction.categoryId);
        const toAccount = transaction.toAccountId ? 
          accounts.find(a => a.accountId === transaction.toAccountId) : null;

        return (
          <Box 
            key={transaction.transactionId}
            onClick={() => handleTransactionClick(transaction)}
            sx={{
              p: 2,
              mb: 1,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: `1px solid ${theme.palette.divider}`,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: 'action.hover',
                '& .transaction-actions': { opacity: 1 }
              }
            }}
          >
            <Grid container alignItems="center" spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: transaction.type === 'income' ? 'success.soft' :
                             transaction.type === 'expense' ? 'error.soft' :
                             'info.soft',
                      color: transaction.type === 'income' ? 'success.main' :
                             transaction.type === 'expense' ? 'error.main' :
                             'info.main'
                    }}
                  >
                    {transaction.type === 'income' ? <ArrowUpward /> :
                     transaction.type === 'expense' ? <ArrowDownward /> :
                     <CompareArrows />}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2">
                      {transaction.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {account?.name} • {category?.name}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="subtitle2" sx={{ textAlign: { sm: 'right' } }}>
                  {transaction.type === 'expense' ? '-' : '+'}
                  {formatCurrency(Math.abs(transaction.amount))}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: { sm: 'right' }, display: 'block' }}>
                  {dayjs(transaction.date).format('MMM D, YYYY')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3} sx={{ 
                display: 'flex', 
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1 
              }}>
                <Chip
                  label={transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                  size="small"
                  sx={{
                    bgcolor: transaction.type === 'income' ? 'success.soft' :
                            transaction.type === 'expense' ? 'error.soft' :
                            'info.soft',
                    color: transaction.type === 'income' ? 'success.main' :
                           transaction.type === 'expense' ? 'error.main' :
                           'info.main'
                  }}
                />
                <Box className="transaction-actions" sx={{ 
                  opacity: 0, 
                  transition: 'opacity 0.2s',
                  display: 'flex',
                  gap: 1
                }}>
                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenTransactionForm('edit', transaction);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(transaction);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Grid>
            </Grid>
          </Box>
        );
      })}
    </Box>
  );

  // Add this component inside the Banking component, before the return statement

  const AccountCard = ({ account }) => {
    const metrics = accountMetrics[account.accountId] || {
      thisMonth: { income: 0, expenses: 0 },
      changes: { income: 0, expenses: 0 }
    };

    return (
      <Card 
        sx={{ 
          height: '100%',
          '&:hover': {
            boxShadow: theme.shadows[4],
            '& .account-actions': { opacity: 1 }
          }
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar
                sx={{
                  bgcolor: account.colorCode + '20',
                  color: account.colorCode,
                  width: 40,
                  height: 40
                }}
              >
                {account.icon}
              </Avatar>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                  {account.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                </Typography>
              </Box>
            </Box>
            <Box className="account-actions" sx={{ 
              opacity: 0, 
              transition: 'opacity 0.2s',
              display: 'flex',
              gap: 1
            }}>
              <IconButton 
                size="small"
                onClick={() => handleOpenAccountForm('edit', account)}
              >
                <EditIcon />
              </IconButton>
              <IconButton 
                size="small" 
                color="error"
                onClick={() => handleDeleteAccount(account)}
                disabled={account.isDefault}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>

          <Typography variant="h5" sx={{ mb: 2 }}>
            {formatCurrency(account.currentBalance)}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Income
                </Typography>
                <Typography variant="subtitle1" color="success.main">
                  {formatCurrency(metrics.thisMonth.income)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Chip
                    icon={metrics.changes.income >= 0 ? <TrendingUp sx={{ fontSize: 16 }} /> : <TrendingDown sx={{ fontSize: 16 }} />}
                    label={`${Math.abs(metrics.changes.income).toFixed(1)}%`}
                    size="small"
                    color={metrics.changes.income >= 0 ? 'success' : 'error'}
                    sx={{ height: 20 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    vs last month
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Expenses
                </Typography>
                <Typography variant="subtitle1" color="error.main">
                  {formatCurrency(metrics.thisMonth.expenses)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Chip
                    icon={metrics.changes.expenses <= 0 ? <TrendingDown sx={{ fontSize: 16 }} /> : <TrendingUp sx={{ fontSize: 16 }} />}
                    label={`${Math.abs(metrics.changes.expenses).toFixed(1)}%`}
                    size="small"
                    color={metrics.changes.expenses <= 0 ? 'success' : 'error'}
                    sx={{ height: 20 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    vs last month
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Add account progress bar */}
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min((metrics.thisMonth.income / (metrics.thisMonth.expenses || 1)) * 50, 100)}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'error.soft',
                '& .MuiLinearProgress-bar': {
                  bgcolor: 'success.main',
                  borderRadius: 3
                }
              }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Add these functions
  const handleImport = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setLoading(true);
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          const bankId = currentBank?.bankId || 1;
          const year = currentYear || new Date().getFullYear();

          // Import accounts
          for (const account of data.accounts || []) {
            await DatabaseService.createAccount(bankId, year, account);
          }

          // Import transactions
          for (const transaction of data.transactions || []) {
            await DatabaseService.addTransaction(bankId, year, transaction);
          }

          handleSnackbar('Data imported successfully');
          await fetchData();
        } catch (error) {
          handleSnackbar('Failed to import data: ' + error.message, 'error');
        } finally {
          setLoading(false);
        }
      };

      reader.readAsText(file);
    } catch (error) {
      handleSnackbar('Failed to read file: ' + error.message, 'error');
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      const data = {
        accounts: accounts,
        transactions: transactions,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expensego-export-${year}-${bankId}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      handleSnackbar('Data exported successfully');
    } catch (error) {
      handleSnackbar('Failed to export data: ' + error.message, 'error');
    }
  };

  // Add advanced filter dialog
  const AdvancedFilterDialog = () => (
    <Dialog 
      open={filterDialogOpen} 
      onClose={() => setFilterDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Advanced Filters</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <DatePicker
                    label="Start Date"
                    value={advancedFilters.dateRange.start}
                    onChange={(newValue) => setAdvancedFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: newValue }
                    }))}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DatePicker
                    label="End Date"
                    value={advancedFilters.dateRange.end}
                    onChange={(newValue) => setAdvancedFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: newValue }
                    }))}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
          </Grid>
          
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Min Amount"
              type="number"
              value={advancedFilters.amountRange.min}
              onChange={(e) => setAdvancedFilters(prev => ({
                ...prev,
                amountRange: { ...prev.amountRange, min: e.target.value }
              }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">{currency.symbol}</InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Max Amount"
              type="number"
              value={advancedFilters.amountRange.max}
              onChange={(e) => setAdvancedFilters(prev => ({
                ...prev,
                amountRange: { ...prev.amountRange, max: e.target.value }
              }))}
              InputProps={{
                startAdornment: <InputAdornment position="start">{currency.symbol}</InputAdornment>
              }}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Categories</InputLabel>
              <Select
                multiple
                value={advancedFilters.categories}
                onChange={(e) => setAdvancedFilters(prev => ({
                  ...prev,
                  categories: e.target.value
                }))}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={categories.find(c => c.categoryId === value)?.name}
                        size="small"
                      />
                    ))}
                  </Box>
                )}
              >
                {categories.map((category) => (
                  <MenuItem key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAdvancedFilters({
          dateRange: { start: null, end: null },
          amountRange: { min: '', max: '' },
          categories: [],
          accounts: [],
          types: []
        })}>
          Reset
        </Button>
        <Button onClick={() => setFilterDialogOpen(false)}>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Container maxWidth="2xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
              Banking Overview
            </Typography>
            <Typography color="text.secondary">
              Manage your accounts and transactions in one place
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<Upload />}
              sx={{ borderRadius: 2 }}
            >
              Import
              <input
                type="file"
                hidden
                accept=".json"
                onChange={handleImport}
              />
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExport}
              sx={{ borderRadius: 2 }}
            >
              Export
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenTransactionForm('add')}
              sx={{
                background: theme.palette.primary.gradient,
                borderRadius: 2
              }}
            >
              Add Transaction
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Accounts Grid */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs>
            <Typography variant="h6">Your Accounts</Typography>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => handleOpenAccountForm('add')}
              sx={{ borderRadius: 2 }}
            >
              Add Account
            </Button>
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          {accounts.map(account => (
            <Grid item xs={12} sm={6} md={4} key={account.accountId}>
              <AccountCard account={account} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Enhanced Filter Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search transactions..."
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Date Range</InputLabel>
                  <Select
                    value={selectedDateRange}
                    onChange={(e) => setSelectedDateRange(e.target.value)}
                    label="Date Range"
                  >
                    <MenuItem value="all">All Time</MenuItem>
                    <MenuItem value="today">Today</MenuItem>
                    <MenuItem value="week">This Week</MenuItem>
                    <MenuItem value="month">This Month</MenuItem>
                    <MenuItem value="year">This Year</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sort By"
                  >
                    <MenuItem value="date">Date</MenuItem>
                    <MenuItem value="amount">Amount</MenuItem>
                    <MenuItem value="description">Description</MenuItem>
                  </Select>
                </FormControl>
                <IconButton onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                  <Sort sx={{ transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'none' }} />
                </IconButton>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ px: 2 }}
          >
            <Tab label="All" />
            <Tab label="Income" />
            <Tab label="Expenses" />
            <Tab label="Transfers" />
          </Tabs>
        </Box>

        <CardContent>
          {loading ? (
            <LinearProgress />
          ) : filteredTransactions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">No transactions found</Typography>
            </Box>
          ) : (
            renderTransactionList()
          )}
        </CardContent>
      </Card>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
      >
        <MenuItem>Date Range</MenuItem>
        <MenuItem>Amount Range</MenuItem>
        <MenuItem>Transaction Type</MenuItem>
        <MenuItem>Categories</MenuItem>
      </Menu>

      {/* Add TransactionForm component */}
      <TransactionForm
        open={transactionForm.open}
        onClose={handleCloseTransactionForm}
        onSubmit={handleTransactionSubmit}
        initialData={transactionForm.data}
        accounts={accounts}
        categories={categories}
        currency={currency}
      />

      {/* Add Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        item={transactionToDelete}
        itemDetails={transactionToDelete && renderTransactionDetails(transactionToDelete)}
      />

      {/* Account Form Dialog */}
      <AccountForm
        open={accountForm.open}
        onClose={handleCloseAccountForm}
        onSubmit={handleAccountSubmit}
        initialData={accountForm.data}
        currency={currency}
      />

      {/* Account Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={accountDeleteDialog}
        onClose={() => setAccountDeleteDialog(false)}
        onConfirm={handleConfirmAccountDelete}
        title="Delete Account"
        message="Are you sure you want to delete this account? This action cannot be undone. All transactions associated with this account will also be deleted."
        item={accountToDelete}
        itemDetails={accountToDelete && renderAccountDetails(accountToDelete)}
      />

      {/* Add Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Add Advanced Filter Dialog */}
      <AdvancedFilterDialog />
    </Container>
  );
};

export default Banking; 