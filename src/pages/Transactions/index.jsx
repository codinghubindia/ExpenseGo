import { useState, useEffect } from 'react';
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

  const getFilteredTransactions = () => {
    return transactions.filter(transaction => {
      if (filters.search && !transaction.description.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.type !== 'all' && transaction.type !== filters.type) {
        return false;
      }
      if (filters.accountId !== 'all' && transaction.accountId !== filters.accountId) {
        return false;
      }
      if (filters.categoryId !== 'all' && transaction.categoryId !== filters.categoryId) {
        return false;
      }
      if (filters.startDate && dayjs(transaction.date).isBefore(filters.startDate, 'day')) {
        return false;
      }
      if (filters.endDate && dayjs(transaction.date).isAfter(filters.endDate, 'day')) {
        return false;
      }
      return true;
    });
  };

  const getTransactionStats = () => {
    const filteredTransactions = getFilteredTransactions();
    return {
      totalIncome: filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: Math.abs(filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)),
      count: filteredTransactions.length
    };
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
                  {formatCurrency(getTransactionStats().totalIncome)}
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
                  {formatCurrency(getTransactionStats().totalExpenses)}
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
                    color: getTransactionStats().totalIncome - getTransactionStats().totalExpenses >= 0 
                      ? 'success.main' 
                      : 'error.main',
                    my: 1 
                  }}
                >
                  {formatCurrency(getTransactionStats().totalIncome - getTransactionStats().totalExpenses)}
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
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
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
                    onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
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
                  onChange={(date) => setFilters({ ...filters, startDate: date })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <DatePicker
                  label="End Date"
                  value={filters.endDate}
                  onChange={(date) => setFilters({ ...filters, endDate: date })}
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
                ({getFilteredTransactions().length} transactions)
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
          ) : getFilteredTransactions().length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No transactions found. Adjust your filters or add a new transaction.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1} sx={{ p: 2 }}>
              {getFilteredTransactions().map((transaction) => {
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
                  <Paper
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  </Paper>
                );
              })}
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