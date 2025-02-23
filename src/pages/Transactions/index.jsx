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
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);
  const [transactionTotals, setTransactionTotals] = useState({ totalIncome: 0, totalExpenses: 0 });

  useEffect(() => {
    loadData();
  }, [currentBank, currentYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      const month = new Date().getMonth();

      const [transactionsData, accountsData, categoriesData] = await Promise.all([
        DatabaseService.getMonthTransactions(bankId, year, month),
        DatabaseService.getAccounts(bankId, year),
        DatabaseService.getCategories(bankId, year)
      ]);

      setTransactions(transactionsData.transactions);
      setTransactionTotals(transactionsData.totals);
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

  const formatDate = (date) => {
    const formattedDate = dayjs(date);
    return formattedDate.isValid() ? formattedDate.format('MMM D, YYYY') : '';
  };

  const formatTime = (time) => {
    if (!time) return '';
    const formattedTime = dayjs(time);
    return formattedTime.isValid() ? formattedTime.format('HH:mm') : '';
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

    // Sort transactions by date, update time, and transaction ID
    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
      // First compare by date
      const dateA = dayjs(a.date).startOf('day');
      const dateB = dayjs(b.date).startOf('day');
      const dateCompare = dateB.valueOf() - dateA.valueOf();
      
      if (dateCompare !== 0) return dateCompare;
      
      // If same date, compare by update time
      const timeA = dayjs(a.updatedAt).valueOf();
      const timeB = dayjs(b.updatedAt).valueOf();
      if (timeA !== timeB) return timeB - timeA;

      // If update times are same, compare by create time
      const createTimeA = dayjs(a.createdAt).valueOf();
      const createTimeB = dayjs(b.createdAt).valueOf();
      if (createTimeA !== createTimeB) return createTimeB - createTimeA;

      // Finally, use transaction ID as tiebreaker
      return Number(b.transactionId) - Number(a.transactionId);
    });

    // Get paginated slice of transactions
    const start = page * rowsPerPage;
    const paginatedTransactions = sortedTransactions.slice(start, start + rowsPerPage);

    return paginatedTransactions;
  }, [filteredTransactions, page, rowsPerPage]);

  const transactionSummary = useMemo(() => {
    return filteredTransactions.reduce((summary, transaction) => {
      // Skip transfer transactions
      if (transaction.type === 'transfer') return summary;

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

  const handleNextPage = async () => {
    const nextPage = page + 1;
    const neededTransactions = (nextPage + 1) * rowsPerPage;
    
    // If we need more transactions, load them
    if (transactions.length < neededTransactions) {
      await loadMoreTransactions();
    }
    
    setPage(nextPage);
  };

  const handlePrevPage = () => {
    setPage((prevPage) => Math.max(0, prevPage - 1));
  };

  const getTransactionIcon = (transaction) => {
    switch (transaction.type) {
      case 'income':
        return <ArrowUpward sx={{ color: 'success.main' }} />;
      case 'expense':
        return <ArrowDownward sx={{ color: 'error.main' }} />;
      case 'transfer':
        return <CompareArrows sx={{ color: 'info.main' }} />;
      default:
        return <Payment />;
    }
  };

  const loadMoreTransactions = async () => {
    try {
      setLoading(true);
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      
      const offset = transactions.length;
      const moreTransactions = await DatabaseService.getTransactions(bankId, year, {
        limit: 10,
        offset
      });

      if (moreTransactions.length > 0) {
        setTransactions(prev => [...prev, ...moreTransactions]);
      }
    } catch (err) {
      setError('Failed to load more transactions');
    } finally {
      setLoading(false);
    }
  };

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
            <Stack spacing={2} sx={{ p: 2 }}>
              {groupedTransactions.map((transaction) => {
                    const account = accounts.find(a => a.accountId === transaction.accountId);
                    const category = categories.find(c => c.categoryId === transaction.categoryId);
                    
                    return (
                  <Box
                        key={transaction.transactionId}
                        sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'stretch', sm: 'flex-start' },
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: 1,
                      '&:hover': {
                            bgcolor: 'action.hover',
                        '& .transaction-actions': {
                              opacity: 1,
                          visibility: 'visible'
                        }
                      }
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: 2,
                      width: '100%',
                      mb: { xs: 2, sm: 0 }
                    }}>
                          <Avatar
                            sx={{
                              bgcolor: transaction.type === 'income' ? 'success.soft' :
                                      transaction.type === 'expense' ? 'error.soft' :
                                      'info.soft',
                          width: 40,
                          height: 40
                            }}
                          >
                        {getTransactionIcon(transaction)}
                          </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                              {transaction.description}
                            </Typography>
                        <Stack 
                          direction={{ xs: 'column', sm: 'row' }} 
                          spacing={{ xs: 0.5, sm: 1 }} 
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          sx={{ mt: 0.5 }}
                        >
                          <Typography 
                            variant="caption" 
                            sx={{
                              color: 'text.secondary',
                              bgcolor: 'action.hover',
                              px: 1,
                              py: 0.5,
                              borderRadius: '8px',
                              display: 'inline-block'
                            }}
                          >
                            {formatDate(transaction.date)}
                          </Typography>
                          {transaction.categoryName && (
                            <Typography 
                              variant="caption" 
                              sx={{
                                color: 'text.secondary',
                                bgcolor: 'action.hover',
                                px: 1,
                                py: 0.5,
                                borderRadius: '8px',
                                display: 'inline-block'
                              }}
                            >
                              {transaction.type === 'transfer' ? 'Transfer' : 
                               transaction.categoryName === 'Uncategorized' ? 'Others' : 
                               transaction.categoryName}
                            </Typography>
                          )}
                          <Typography 
                            variant="caption" 
                            sx={{
                              color: 'text.secondary',
                              bgcolor: 'action.hover',
                              px: 1,
                              py: 0.5,
                              borderRadius: '8px',
                              display: 'inline-block'
                            }}
                          >
                            {account?.name || 'Unknown Account'}
                          </Typography>
                          </Stack>
                          </Box>
                        </Box>

                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      width: { xs: '100%', sm: 'auto' },
                      justifyContent: { xs: 'space-between', sm: 'flex-end' }
                    }}>
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
                          <Box 
                          className="transaction-actions"
                            sx={{
                              display: 'flex',
                              gap: 1,
                          opacity: { xs: 1, sm: 0 },
                          visibility: { xs: 'visible', sm: 'hidden' },
                            transition: 'all 0.2s ease-in-out'
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setFormOpen(true);
                              }}
                          sx={{ 
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'action.hover' }
                              }}
                            >
                          <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setTransactionToDelete(transaction);
                                setDeleteDialog(true);
                              }}
                          sx={{ 
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'error.soft' }
                              }}
                            >
                          <DeleteIcon fontSize="small" />
                            </IconButton>
                      </Box>
                    </Box>
                  </Box>
                    );
                  })}

              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button
                  disabled={page === 0}
                  onClick={handlePrevPage}
                  sx={{ mr: 1 }}
                >
                  Previous
                </Button>
                <Button
                  disabled={groupedTransactions.length < rowsPerPage}
                  onClick={handleNextPage}
                >
                  Next
                </Button>
              </Box>
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