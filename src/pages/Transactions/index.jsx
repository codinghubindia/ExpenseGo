import { useState, useEffect } from 'react';
import {
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ArrowUpward,
  ArrowDownward,
  CompareArrows,
  Circle,
  ArrowForward,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useApp } from '../../contexts/AppContext';
import DatabaseService from '../../services/DatabaseService';
import { useRegion } from '../../contexts/RegionContext';

const Transactions = () => {
  const theme = useTheme();
  const { currentBank, currentYear } = useApp();
  const { currency } = useRegion();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    transactionId: null,
    type: 'expense',
    amount: '',
    date: dayjs(),
    accountId: '',
    toAccountId: '',
    categoryId: '',
    description: '',
    paymentMethod: 'cash',
    location: ''
  });
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    startDate: null,
    endDate: null,
    accountId: 'all',
    categoryId: 'all'
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransaction = (transaction) => {
    setFormData({
      transactionId: transaction.transactionId,
      type: transaction.type,
      amount: Math.abs(transaction.amount),
      date: dayjs(transaction.date),
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId || '',
      categoryId: transaction.categoryId || '',
      description: transaction.description,
      paymentMethod: transaction.paymentMethod,
      location: transaction.location || ''
    });
    setOpenDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      const transactionData = {
        type: formData.type,
        amount: formData.type === 'expense' ? -Math.abs(Number(formData.amount)) : Number(formData.amount),
        date: formData.date.toISOString(),
        accountId: formData.accountId,
        toAccountId: formData.type === 'transfer' ? formData.toAccountId : null,
        categoryId: formData.type === 'transfer' ? null : formData.categoryId,
        description: formData.description,
        paymentMethod: formData.paymentMethod || 'cash',
        location: formData.location || ''
      };

      if (formData.transactionId) {
        await DatabaseService.updateTransaction(
          bankId,
          year,
          formData.transactionId,
          transactionData
        );
      } else {
        await DatabaseService.createTransaction(bankId, year, transactionData);
      }

      await loadData();
      handleCloseDialog();
      setError(null);
    } catch (err) {
      console.error('Transaction error:', err);
      setError(err.message || 'Failed to save transaction');
    }
  };

  const handleCloseDialog = () => {
    setFormData({
      transactionId: null,
      type: 'expense',
      amount: '',
      date: dayjs(),
      accountId: '',
      toAccountId: '',
      categoryId: '',
      description: '',
      paymentMethod: 'cash',
      location: ''
    });
    setOpenDialog(false);
    setError(null);
  };

  const resetForm = () => {
    setFormData({
      transactionId: null,
      type: 'expense',
      amount: '',
      date: dayjs(),
      accountId: '',
      toAccountId: '',
      categoryId: '',
      description: '',
      paymentMethod: 'cash',
      location: ''
    });
  };

  const filteredTransactions = transactions.filter(t => {
    if (filters.search && !t.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.type !== 'all' && t.type !== filters.type) return false;
    if (filters.startDate && dayjs(t.date).isBefore(filters.startDate, 'day')) return false;
    if (filters.endDate && dayjs(t.date).isAfter(filters.endDate, 'day')) return false;
    if (filters.accountId !== 'all' && t.accountId !== filters.accountId) return false;
    if (filters.categoryId !== 'all' && t.categoryId !== filters.categoryId) return false;
    return true;
  });

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDeleteTransaction = async (transaction) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        const bankId = currentBank?.bankId || 1;
        const year = currentYear || new Date().getFullYear();
        await DatabaseService.deleteTransaction(bankId, year, transaction.transactionId);
        await loadData();
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  const amountInput = (
    <TextField
      fullWidth
      label="Amount"
      type="number"
      value={formData.amount}
      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
      required
      InputProps={{
        startAdornment: <InputAdornment position="start">{currency.symbol}</InputAdornment>
      }}
    />
  );

  const renderTransactionAmount = (transaction) => (
    <Typography
      variant="subtitle1"
      color={
        transaction.type === 'income' ? 'success.main' :
        transaction.type === 'expense' ? 'error.main' :
        'primary.main'
      }
      sx={{ fontWeight: 600 }}
    >
      {transaction.type === 'income' ? '+' : 
       transaction.type === 'expense' ? '-' : ''}
      {formatCurrency(transaction.amount)}
    </Typography>
  );

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'income':
        return <ArrowUpward sx={{ color: 'success.main' }} />;
      case 'expense':
        return <ArrowDownward sx={{ color: 'error.main' }} />;
      case 'transfer':
        return <CompareArrows sx={{ color: 'info.main' }} />;
      default:
        return <Circle />;
    }
  };

  const handleDeleteClick = (transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      if (!transactionToDelete) return;

      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      
      await DatabaseService.deleteTransaction(bankId, year, transactionToDelete.transactionId);
      await loadData();
      setDeleteDialog(false);
      setTransactionToDelete(null);
      setError(null);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setError(error.message || 'Failed to delete transaction');
    }
  };

  // Add payment method options
  const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'upi', label: 'UPI' },
    { value: 'netbanking', label: 'Net Banking' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* Header Section */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" fontWeight="bold">
            Transactions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
            >
              Add Transaction
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Filters Section */}
          <Grid item xs={12}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <SearchIcon color="action" />
                  <Typography variant="h6">Filters</Typography>
                </Box>
                <Grid container spacing={{ xs: 2, md: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                      placeholder="Search transactions..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        label="Type"
                      >
                        <MenuItem value="all">All Types</MenuItem>
                        <MenuItem value="expense">Expense</MenuItem>
                        <MenuItem value="income">Income</MenuItem>
                        <MenuItem value="transfer">Transfer</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
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
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={filters.categoryId}
                        onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                        label="Category"
                      >
                        <MenuItem value="all">All Categories</MenuItem>
                        {categories.map(category => (
                          <MenuItem key={category.categoryId} value={category.categoryId}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Transaction Form Dialog */}
          <Dialog 
            open={openDialog} 
            onClose={handleCloseDialog}
            fullScreen={isMobile}
            fullWidth
          >
            <DialogTitle>
              {formData.transactionId ? 'Edit Transaction' : 'Add New Transaction'}
            </DialogTitle>
            <form onSubmit={handleSubmit}>
              <DialogContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        label="Type"
                      >
                        <MenuItem value="expense">Expense</MenuItem>
                        <MenuItem value="income">Income</MenuItem>
                        <MenuItem value="transfer">Transfer</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    {amountInput}
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <DatePicker
                      label="Date"
                      value={formData.date}
                      onChange={(newDate) => setFormData({ ...formData, date: newDate })}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Account</InputLabel>
                      <Select
                        value={formData.accountId}
                        onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                        label="Account"
                        required
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
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>To Account</InputLabel>
                        <Select
                          value={formData.toAccountId}
                          onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
                          label="To Account"
                          required
                        >
                          {accounts.map(account => (
                            <MenuItem key={account.accountId} value={account.accountId}>
                              {account.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  ) : (
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Category</InputLabel>
                        <Select
                          value={formData.categoryId}
                          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                          label="Category"
                          required
                        >
                          {categories
                            .filter(cat => cat.type === formData.type)
                            .map(category => (
                              <MenuItem key={category.categoryId} value={category.categoryId}>
                                {category.name}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth margin="dense">
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      >
                        {PAYMENT_METHODS.map(method => (
                          <MenuItem key={method.value} value={method.value}>
                            {method.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained">
                  {formData.transactionId ? 'Update' : 'Add'} Transaction
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          {/* Transactions List */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h6">
                    Transaction History
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    {filteredTransactions.length} transactions found
                  </Typography>
                </Box>

                <Stack spacing={2}>
                  {filteredTransactions.map((transaction) => {
                    const account = accounts.find(a => a.accountId === transaction.accountId);
                    const category = categories.find(c => c.categoryId === transaction.categoryId);
                    const toAccount = accounts.find(a => a.accountId === transaction.toAccountId);
                    
                    return (
                      <Box
                        key={transaction.transactionId}
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          justifyContent: 'space-between',
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          p: { xs: 1.5, sm: 2 },
                          gap: { xs: 1, sm: 2 },
                          borderRadius: 2,
                          bgcolor: 'background.paper',
                          boxShadow: 1,
                          position: 'relative',
                          '&:hover, &:focus-within': {
                            bgcolor: 'action.hover',
                            cursor: 'pointer',
                            '& .action-buttons': {
                              opacity: 1,
                              visibility: 'visible',
                            }
                          }
                        }}
                        onClick={() => handleEditTransaction(transaction)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: transaction.type === 'income' ? 'success.soft' :
                                      transaction.type === 'expense' ? 'error.soft' :
                                      'info.soft'
                            }}
                          >
                            {getTransactionIcon(transaction.type)}
                          </Box>
                          
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 500 }}>
                              {transaction.description}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
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
                              <Typography variant="caption" color="text.secondary">
                                {account?.name}
                              </Typography>
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
                                  <Typography variant="caption" color="text.secondary">
                                    {category.name}
                                  </Typography>
                                </>
                              )}
                            </Box>
                          </Box>
                        </Box>

                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 2, 
                          ml: 2 
                        }}>
                          {/* Amount and Type Column */}
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'flex-end'
                          }}>
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
                              label={transaction.type === 'transfer' ? 'Transfer' : 
                                     transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                              size="small"
                              sx={{
                                mt: 0.5,
                                bgcolor: transaction.type === 'income' ? 'success.soft' :
                                        transaction.type === 'expense' ? 'error.soft' :
                                        'info.soft',
                                color: transaction.type === 'income' ? 'success.main' :
                                       transaction.type === 'expense' ? 'error.main' :
                                       'info.main'
                              }}
                            />
                          </Box>

                          {/* Action Buttons */}
                          <Box 
                            className="action-buttons"
                            sx={{
                              display: 'flex',
                              gap: 1,
                              opacity: 0,
                              visibility: 'hidden',
                              transition: 'all 0.2s ease-in-out',
                              ml: 2
                            }}
                          >
                            <IconButton
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTransaction(transaction);
                              }}
                              size="small"
                              component="span"
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(transaction);
                              }}
                              size="small"
                              component="span"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialog}
          onClose={() => setDeleteDialog(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </Typography>
            {transactionToDelete && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {`${transactionToDelete.type.charAt(0).toUpperCase() + transactionToDelete.type.slice(1)}`}
                </Typography>
                <Typography>
                  {formatCurrency(Math.abs(transactionToDelete.amount))}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dayjs(transactionToDelete.date).format('MMM D, YYYY')}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleConfirmDelete} 
              color="error" 
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default Transactions;