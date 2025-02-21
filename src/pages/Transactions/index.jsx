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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
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
  const { currency } = useRegion(); // Add RegionContext usage
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
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
  const [expanded, setExpanded] = useState(false);

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
      type: transaction.type,
      amount: transaction.amount,
      date: dayjs(transaction.date),
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId,
      categoryId: transaction.categoryId,
      description: transaction.description,
      paymentMethod: transaction.paymentMethod,
      location: transaction.location
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      if (formData.transactionId) {
        await DatabaseService.updateTransaction(bankId, year, formData.transactionId, formData);
      } else {
        await DatabaseService.createTransaction(bankId, year, formData);
      }

      setFormData({
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
      await loadData();
    } catch (err) {
      setError(err.message);
    }
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
        // TODO: Show error notification
      }
    }
  };

  const handleAccordionChange = (event, isExpanded) => {
    setExpanded(isExpanded);
  };

  // Add formatCurrency function
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(amount));
  };

  // Update amount input in form
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

  // Update transaction amount display
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

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {/* Header Section */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" fontWeight="bold">
            Transactions
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setExpanded(true)}
          >
            Add Transaction
          </Button>
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
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
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

          {/* Transaction Form */}
          <Grid item xs={12}>
            <Accordion 
              expanded={expanded} 
              onChange={handleAccordionChange}
              sx={{
                mb: 3,
                '&:before': { display: 'none' },
                boxShadow: theme.shadows[2],
                borderRadius: '16px !important',
                '& .MuiAccordionSummary-root': {
                  borderRadius: expanded ? '16px 16px 0 0' : '16px',
                },
                '& .MuiAccordionDetails-root': {
                  borderRadius: '0 0 16px 16px',
                }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: expanded ? '16px 16px 0 0' : '16px',
                  '&:hover': { bgcolor: 'background.subtle' }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AddIcon color="primary" />
                  <Typography variant="h6">
                    {formData.transactionId ? 'Edit Transaction' : 'Add New Transaction'}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  bgcolor: 'background.paper',
                  borderRadius: '0 0 16px 16px',
                  pt: 0
                }}
              >
                <form onSubmit={handleSubmit}>
                  <Stack spacing={2}>
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
                        <FormControl fullWidth>
                          <InputLabel>Payment Method</InputLabel>
                          <Select
                            value={formData.paymentMethod}
                            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                            label="Payment Method"
                          >
                            <MenuItem value="cash">Cash</MenuItem>
                            <MenuItem value="card">Card</MenuItem>
                            <MenuItem value="bank">Bank Transfer</MenuItem>
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

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                      <Button
                        type="button"
                        onClick={() => {
                          setFormData({
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
                          setExpanded(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="contained">
                        {formData.transactionId ? 'Update' : 'Add'} Transaction
                      </Button>
                    </Box>
                  </Stack>
                </form>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Transactions List */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 3 
                }}>
                  <Typography variant="h6">
                    Transaction History
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {filteredTransactions.length} transactions found
                  </Typography>
                </Box>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : filteredTransactions.length === 0 ? (
                  <Box sx={{ 
                    textAlign: 'center', 
                    py: 8,
                    bgcolor: 'background.subtle',
                    borderRadius: 2
                  }}>
                    <Typography color="text.secondary">
                      No transactions found
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    {filteredTransactions.map((transaction) => (
                      <Box
                        key={transaction.transactionId}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'background.subtle',
                          transition: 'all 0.2s',
                          '&:hover': {
                            bgcolor: 'background.default',
                            boxShadow: theme.shadows[1]
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: transaction.type === 'income' ? 'success.light' :
                                      transaction.type === 'expense' ? 'error.light' :
                                      'primary.light',
                              color: transaction.type === 'income' ? 'success.main' :
                                     transaction.type === 'expense' ? 'error.main' :
                                     'primary.main'
                            }}
                          >
                            {transaction.type === 'income' ? '↑' :
                             transaction.type === 'expense' ? '↓' : '↔'}
                          </Box>
                          <Box>
                            <Typography variant="subtitle1">
                              {transaction.description}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {dayjs(transaction.date).format('MMM D, YYYY')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">•</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {accounts.find(a => a.accountId === transaction.accountId)?.name}
                              </Typography>
                              {transaction.type !== 'transfer' && (
                                <>
                                  <Typography variant="caption" color="text.secondary">•</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {categories.find(c => c.categoryId === transaction.categoryId)?.name}
                                  </Typography>
                                </>
                              )}
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {renderTransactionAmount(transaction)}
                          <Box sx={{ 
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            '.MuiBox-root:hover > &': {
                              opacity: 1
                            }
                          }}>
                            <IconButton
                              size="small"
                              onClick={() => handleEditTransaction(transaction)}
                              sx={{ mr: 1 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteTransaction(transaction)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default Transactions;