import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Stack,
  IconButton,
  useTheme,
  InputAdornment,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  Tooltip,
  useMediaQuery,
  Paper,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ArrowUpward,
  ArrowDownward,
  CompareArrows,
  Circle,
  ArrowForward,
  Refresh as RefreshIcon,
  School,
  Restaurant,
  ShoppingCart,
  DirectionsCar,
  Receipt,
  LocalPlay,
  LocalHospital,
  FlightTakeoff,
  AccountBalance,
  Payments,
  AccountBalanceWallet,
  Category,
  Payment
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useApp } from '../../contexts/AppContext';
import DatabaseService from '../../services/DatabaseService';
import { useRegion } from '../../contexts/RegionContext';
import TransactionForm from '../../components/Forms/TransactionForm';
import DeleteConfirmationDialog from '../../components/Dialogs/DeleteConfirmationDialog';

const Transactions = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentBank, currentYear } = useApp();
  const { currency } = useRegion();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    startDate: null,
    endDate: null,
    accountId: 'all',
    categoryId: 'all'
  });
  const [formOpen, setFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  useEffect(() => {
    loadData();
  }, [currentBank, currentYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      const [transactionsData, accountsData, categoriesData] = await Promise.all([
        DatabaseService.getTransactions(bankId, year),
        DatabaseService.getAccounts(bankId, year),
        DatabaseService.getCategories(bankId, year)
      ]);

      setTransactions(transactionsData);
      setAccounts(accountsData);
      setCategories(categoriesData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      if (selectedTransaction) {
        await DatabaseService.updateTransaction(bankId, year, selectedTransaction.transactionId, formData);
      } else {
        await DatabaseService.addTransaction(bankId, year, formData);
      }

      await loadData();
      setFormOpen(false);
      setSelectedTransaction(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
      try {
        const bankId = currentBank?.bankId || 1;
        const year = currentYear || new Date().getFullYear();
      await DatabaseService.deleteTransaction(bankId, year, transactionToDelete.transactionId);
        await loadData();
      setDeleteDialog(false);
      setTransactionToDelete(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.code
    }).format(amount);
  };

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(transaction => {
      const matchesSearch = !filters.search || 
        transaction.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        transaction.accountName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        transaction.categoryName?.toLowerCase().includes(filters.search.toLowerCase());

      const matchesType = filters.type === 'all' || transaction.type === filters.type;
      
      const matchesAccount = filters.accountId === 'all' || 
        transaction.accountId === filters.accountId ||
        transaction.toAccountId === filters.accountId;

      const matchesCategory = filters.categoryId === 'all' || 
        transaction.categoryId === filters.categoryId;

      const transactionDate = dayjs(transaction.date);
      const matchesDateRange = (!filters.startDate || transactionDate.isAfter(filters.startDate)) &&
        (!filters.endDate || transactionDate.isBefore(filters.endDate));

      return matchesSearch && matchesType && matchesAccount && 
             matchesCategory && matchesDateRange;
    });
  }, [transactions, filters]);

  const groupedTransactions = useMemo(() => {
    if (!filteredTransactions) return [];

    // Sort transactions by date and update/create time (newest first)
    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
      // First compare by date
      const dateA = dayjs(a.date).startOf('day');
      const dateB = dayjs(b.date).startOf('day');
      const dateCompare = dateB.valueOf() - dateA.valueOf();
      
      if (dateCompare !== 0) return dateCompare;
      
      // If same date, compare by update/create time
      const timeA = dayjs(a.updatedAt || a.createdAt);
      const timeB = dayjs(b.updatedAt || b.createdAt);
      return timeB.valueOf() - timeA.valueOf();
    });

    // Group transactions by date
    const groups = sortedTransactions.reduce((acc, transaction) => {
      const dateKey = dayjs(transaction.date).format('YYYY-MM-DD');
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          transactions: [],
          totals: {
            income: 0,
            expenses: 0,
            net: 0
          }
        };
      }

      // Keep transactions within each group sorted by update/create time
      const transactions = [...acc[dateKey].transactions, transaction].sort((a, b) => {
        const timeA = dayjs(a.updatedAt || a.createdAt);
        const timeB = dayjs(b.updatedAt || b.createdAt);
        return timeB.valueOf() - timeA.valueOf();
      });

      acc[dateKey] = {
        ...acc[dateKey],
        transactions,
        totals: transactions.reduce((totals, t) => {
          if (t.type === 'income') {
            totals.income += Math.abs(t.amount);
            totals.net += Math.abs(t.amount);
          } else if (t.type === 'expense') {
            totals.expenses += Math.abs(t.amount);
            totals.net -= Math.abs(t.amount);
          }
          return totals;
        }, { income: 0, expenses: 0, net: 0 })
      };
      
      return acc;
    }, {});

    // Convert to array and sort by date
    return Object.values(groups).sort((a, b) => 
      dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
    );
  }, [filteredTransactions]);

  const transactionSummary = useMemo(() => {
    return filteredTransactions.reduce((summary, transaction) => {
      const amount = Math.abs(transaction.amount);
      if (transaction.type === 'income') {
        summary.totalIncome += amount;
      } else if (transaction.type === 'expense') {
        summary.totalExpenses += amount;
      }
      return summary;
    }, { totalIncome: 0, totalExpenses: 0 });
  }, [filteredTransactions]);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      const batchSize = 100;
      let allTransactions = [];
      let offset = 0;

      while (true) {
        const batch = await DatabaseService.getTransactions(bankId, year, {
          ...filters,
          limit: batchSize,
          offset
        });

        if (!batch.length) break;
        allTransactions = [...allTransactions, ...batch];
        offset += batchSize;

        if (batch.length < batchSize) break;
      }

      setTransactions(allTransactions);
    } catch (error) {
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [currentBank, currentYear, filters]);

  const handleFilterChange = useCallback((name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (filters.search) {
        loadTransactions();
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [filters.search, loadTransactions]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Transactions
          </Typography>
              <Typography color="text.secondary" variant="body1">
                Manage your income, expenses, and transfers
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
                  onClick={loadData}
                  disabled={loading}
                >
                  Refresh
                </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedTransaction(null);
                    setFormOpen(true);
                  }}
                  disabled={loading}
            >
              Add Transaction
            </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Income
                </Typography>
                <Typography variant="h4" sx={{ color: 'success.main', my: 1 }}>
                  {formatCurrency(transactionSummary.totalIncome)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  From filtered transactions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Expenses
                </Typography>
                <Typography variant="h4" sx={{ color: 'error.main', my: 1 }}>
                  {formatCurrency(transactionSummary.totalExpenses)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  From filtered transactions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  Net Balance
                </Typography>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    color: transactionSummary.totalIncome - transactionSummary.totalExpenses >= 0 
                      ? 'success.main' 
                      : 'error.main',
                    my: 1 
                  }}
                >
                  {formatCurrency(transactionSummary.totalIncome - transactionSummary.totalExpenses)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Income - Expenses
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      placeholder="Search transactions..."
                      value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                        <SearchIcon color="action" />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
              <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                        label="Type"
                      >
                        <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="income">Income</MenuItem>
                        <MenuItem value="expense">Expense</MenuItem>
                        <MenuItem value="transfer">Transfer</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
              <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Account</InputLabel>
                      <Select
                        value={filters.accountId}
                    onChange={(e) => handleFilterChange('accountId', e.target.value)}
                        label="Account"
                      >
                        <MenuItem value="all">All Accounts</MenuItem>
                        {accounts.map(account => (
                          <MenuItem key={account.accountId} value={account.accountId}>
                            {account.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
              <Grid item xs={12} sm={6} md={2}>
                    <DatePicker
                  label="Start Date"
                  value={filters.startDate}
                  onChange={(date) => handleFilterChange('startDate', date)}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <DatePicker
                  label="End Date"
                  value={filters.endDate}
                  onChange={(date) => handleFilterChange('endDate', date)}
                  slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
                </Grid>
          </CardContent>
        </Card>

          {/* Transactions List */}
            <Card>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h6">
              Transaction List
              <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                ({filteredTransactions.length} transactions)
              </Typography>
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedTransaction(null);
                setFormOpen(true);
              }}
              size="small"
            >
              Add Transaction
            </Button>
          </Box>
          <Divider />

          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={32} />
              <Typography sx={{ mt: 2 }} color="text.secondary">
                Loading transactions...
                  </Typography>
            </Box>
          ) : filteredTransactions.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No transactions found. Adjust your filters or add a new transaction.
                  </Typography>
                </Box>
          ) : (
            <Stack spacing={2}>
              {groupedTransactions.map((group) => (
                <Box key={group.date}>
                  <Box 
              sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: 2,
                      mt: 3
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight="500">
                      {dayjs(group.date).format('dddd, MMMM D, YYYY')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography variant="body2" color="success.main">
                        +{formatCurrency(group.totals.income)}
                      </Typography>
                      <Typography variant="body2" color="error.main">
                        -{formatCurrency(group.totals.expenses)}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color={group.totals.net >= 0 ? 'success.main' : 'error.main'}
                        fontWeight="500"
                      >
                        {formatCurrency(Math.abs(group.totals.net))}
                      </Typography>
                    </Box>
                  </Box>

                  <Stack spacing={1}>
                    {group.transactions.map((transaction) => {
                    const account = accounts.find(a => a.accountId === transaction.accountId);
                    const category = categories.find(c => c.categoryId === transaction.categoryId);
                    const toAccount = accounts.find(a => a.accountId === transaction.toAccountId);

                // Get appropriate icon based on category or transaction type
                const getTransactionIcon = () => {
                  if (transaction.type === 'transfer') return <CompareArrows />;
                  
                  switch(category?.name?.toLowerCase()) {
                    case 'education': return <School />;
                    case 'food & dining': return <Restaurant />;
                    case 'shopping': return <ShoppingCart />;
                    case 'transportation': return <DirectionsCar />;
                    case 'bills & utilities': return <Receipt />;
                    case 'entertainment': return <LocalPlay />;
                    case 'health': return <LocalHospital />;
                    case 'travel': return <FlightTakeoff />;
                    case 'general expense': return <AccountBalance />;
                    case 'other income': return <Payments />;
                    default: return transaction.type === 'income' ? <ArrowUpward /> : <ArrowDownward />;
                  }
                };
                    
                    return (
                  <Card
                        key={transaction.transactionId}
                    elevation={0}
                        sx={{
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                          borderRadius: 2,
                      '&:hover': {
                            bgcolor: 'action.hover',
                        '& .transaction-actions': {
                              opacity: 1,
                          visibility: 'visible'
                        }
                      }
                    }}
                  >
                    {/* Mobile View */}
                    <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{
                              bgcolor: transaction.type === 'income' ? 'success.soft' :
                                      transaction.type === 'expense' ? 'error.soft' :
                                      'info.soft',
                              width: 32,
                              height: 32
                            }}
                          >
                            {getTransactionIcon()}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" noWrap>
                              {transaction.description}
                            </Typography>
                                  <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                              {dayjs(transaction.date).format('MMM D, YYYY')}
                            </Typography>
                                    <Box
                                      component="span"
                                      sx={{
                                        width: 4,
                                        height: 4,
                                        borderRadius: '50%',
                                        bgcolor: 'text.disabled'
                                      }}
                                    />
                                    <Tooltip title="Last updated">
                                      <Typography variant="caption" color="text.secondary">
                                        {dayjs(transaction.updatedAt || transaction.createdAt).format('HH:mm')}
                                      </Typography>
                                    </Tooltip>
                                  </Stack>
                          </Box>
                        </Box>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            color: transaction.type === 'income' ? 'success.main' :
                                   transaction.type === 'expense' ? 'error.main' :
                                   'info.main',
                            fontWeight: 500
                          }}
                        >
                          {transaction.type === 'income' ? '+' : 
                           transaction.type === 'expense' ? '-' : ''}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </Typography>
                      </Box>

                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        flexWrap: 'wrap',
                        mt: 1
                      }}>
                        <Chip
                          size="small"
                          label={account?.name || ''}
                          icon={<AccountBalanceWallet sx={{ fontSize: 16 }} />}
                        />
                        {category && (
                          <Chip
                            size="small"
                            label={category.name}
                            icon={<Category sx={{ fontSize: 16 }} />}
                          />
                        )}
                        <Chip
                          size="small"
                          label={transaction.paymentMethod.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                          icon={<Payment sx={{ fontSize: 16 }} />}
                        />
                      </Box>

                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end',
                        gap: 1,
                        mt: 1
                      }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setFormOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setTransactionToDelete(transaction);
                              setDeleteDialog(true);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* Desktop View */}
                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <Avatar
                          sx={{
                            bgcolor: transaction.type === 'income' ? 'success.soft' :
                                    transaction.type === 'expense' ? 'error.soft' :
                                    'info.soft',
                            color: transaction.type === 'income' ? 'success.main' :
                                   transaction.type === 'expense' ? 'error.main' :
                                   'info.main',
                            width: 40,
                            height: 40
                          }}
                        >
                          {getTransactionIcon()}
                        </Avatar>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {transaction.description}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="caption" color="text.secondary">
                                {dayjs(transaction.date).format('MMM DD, YYYY')}
                              </Typography>
                              <Box
                                component="span"
                                sx={{
                                  width: 4,
                                  height: 4,
                                  borderRadius: '50%',
                                  bgcolor: 'text.disabled'
                                }}
                              />
                                    <Tooltip title="Last updated">
                                      <Typography variant="caption" color="text.secondary">
                                        {dayjs(transaction.updatedAt || transaction.createdAt).format('HH:mm')}
                                      </Typography>
                                    </Tooltip>
                            <Tooltip title="Account">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AccountBalanceWallet sx={{ fontSize: 14, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {account?.name}
                              </Typography>
                              </Box>
                            </Tooltip>
                              {transaction.type === 'transfer' && toAccount && (
                                <>
                                  <ArrowForward sx={{ fontSize: 12, color: 'text.disabled' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {toAccount.name}
                                  </Typography>
                                </>
                              )}
                              {category && (
                                <>
                                  <Box
                                    component="span"
                                    sx={{
                                      width: 4,
                                      height: 4,
                                      borderRadius: '50%',
                                      bgcolor: 'text.disabled'
                                    }}
                                  />
                                <Tooltip title="Category">
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Category sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {category.name}
                                  </Typography>
                                  </Box>
                                </Tooltip>
                                </>
                              )}
                            {transaction.paymentMethod && (
                              <>
                                <Box
                                  component="span"
                                  sx={{
                                    width: 4,
                                    height: 4,
                                    borderRadius: '50%',
                                    bgcolor: 'text.disabled'
                                  }}
                                />
                                <Tooltip title="Payment Method">
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Payment sx={{ fontSize: 14, color: 'text.secondary' }} />
                                    <Typography variant="caption" color="text.secondary">
                                      {transaction.paymentMethod.split('_').map(word => 
                                        word.charAt(0).toUpperCase() + word.slice(1)
                                      ).join(' ')}
                                    </Typography>
                            </Box>
                                </Tooltip>
                              </>
                            )}
                          </Stack>
                          </Box>
                        </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                color: transaction.type === 'income' ? 'success.main' :
                                       transaction.type === 'expense' ? 'error.main' :
                                       'info.main',
                                fontWeight: 500
                              }}
                            >
                              {transaction.type === 'income' ? '+' : 
                               transaction.type === 'expense' ? '-' : ''}
                              {formatCurrency(Math.abs(transaction.amount))}
                            </Typography>
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
                          </Box>

                          <Box 
                          className="transaction-actions"
                            sx={{
                              display: 'flex',
                              gap: 1,
                              opacity: 0,
                              visibility: 'hidden',
                            transition: 'all 0.2s ease-in-out'
                            }}
                          >
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setFormOpen(true);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setTransactionToDelete(transaction);
                                setDeleteDialog(true);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  </Card>
                    );
                  })}
                  </Stack>
                </Box>
              ))}
                </Stack>
          )}
            </Card>

        {/* Transaction Form */}
        <TransactionForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setSelectedTransaction(null);
          }}
          onSubmit={handleSubmit}
          accounts={accounts}
          categories={categories}
          initialData={selectedTransaction}
          currency={currency}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialog}
          onClose={() => {
            setDeleteDialog(false);
            setTransactionToDelete(null);
          }}
          onConfirm={handleDelete}
          title="Delete Transaction"
          message="Are you sure you want to delete this transaction? This action cannot be undone."
          item={transactionToDelete}
        />

        {/* Error Snackbar */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              position: 'fixed', 
              bottom: 16, 
              right: 16,
              zIndex: theme.zIndex.snackbar
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default Transactions;