import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  Chip,
  Stack,
  Button,
  useTheme,
  Container,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import {
  TrendingUp,
  MoreVert,
  Add as AddIcon,
  ArrowUpward,
  ArrowDownward,
  AccountBalance,
  TrendingDown,
  Savings,
  CompareArrows,
  Payment,
  AccountBalanceWallet,
  LocalAtm,
  ArrowForward
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { useApp } from '../../contexts/AppContext';
import DatabaseService from '../../services/DatabaseService';
import { useRegion } from '../../contexts/RegionContext';
import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useNavigate } from 'react-router-dom';

const chartColors = {
  income: '#4CAF50',
  expense: '#F44336',
  transfer: '#2196F3',
  gradient: {
    income: ['#4CAF50', '#81C784'],
    expense: ['#F44336', '#E57373'],
    balance: ['#2196F3', '#64B5F6']
  }
};

const Dashboard = () => {
  const theme = useTheme();
  const { currentBank, currentYear } = useApp();
  const [accounts, setAccounts] = useState([]);
  const { currency } = useRegion();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactionForm, setTransactionForm] = useState({
    open: false,
    mode: 'add',
    data: null,
    loading: false,
    error: null
  });

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

  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      const [fetchedAccounts, fetchedCategories, fetchedTransactions] = await Promise.all([
        DatabaseService.getAccounts(bankId, year),
        DatabaseService.getCategories(bankId, year),
        DatabaseService.getTransactions(bankId, year)
      ]);

      setAccounts(fetchedAccounts);
      setCategories(fetchedCategories);
      setTransactions(fetchedTransactions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentBank, currentYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.code
    }).format(amount);
  };

  const getTotalBalance = () => {
    return accounts.reduce((sum, account) => sum + account.currentBalance, 0);
  };

  const getMonthlyIncome = () => {
    return transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getMonthlyExpenses = () => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const getMonthlySavings = () => {
    const monthlyIncome = getMonthlyIncome();
    const monthlyExpenses = getMonthlyExpenses();
    return monthlyIncome - monthlyExpenses;
  };

  const getSavingsRate = () => {
    const monthlyIncome = getMonthlyIncome();
    const monthlyExpenses = getMonthlyExpenses();
    if (monthlyIncome === 0) return 0;
    return ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
  };

  const getActivityProgress = () => {
    const today = new Date().getDate();
    const daysInMonth = new Date(currentYear, new Date().getMonth() + 1, 0).getDate();
    return (today / daysInMonth) * 100;
  };

  const getMonthlyData = () => {
    const monthlyData = Array(12).fill(0).map((_, i) => ({
      name: new Date(2024, i).toLocaleString('default', { month: 'short' }),
      income: 0,
      expenses: 0
    }));

    transactions.forEach(t => {
      const month = new Date(t.date).getMonth();
      if (t.type === 'income') {
        monthlyData[month].income += t.amount;
      } else if (t.type === 'expense') {
        monthlyData[month].expenses += Math.abs(t.amount);
      }
    });

    return monthlyData;
  };

  const getCategoryData = () => {
    const categoryMap = new Map();
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const category = categories.find(c => c.categoryId === t.categoryId);
        if (category) {
          const amount = Math.abs(t.amount);
          categoryMap.set(category.name, (categoryMap.get(category.name) || 0) + amount);
        }
      });

    return Array.from(categoryMap, ([name, value]) => ({ name, value }));
  };

  const COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A5A5', '#9B6B6B', '#E9D985', '#556270', '#6C5B7B'
  ];

  const totalBalance = getTotalBalance();
  const monthlyIncome = getMonthlyIncome();
  const monthlyExpenses = getMonthlyExpenses();
  const monthlySavings = getMonthlySavings();
  const savingsRate = getSavingsRate();

  const getLastMonthBalance = () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    return transactions
      .filter(t => {
        const txDate = new Date(t.date);
        return txDate.getMonth() === lastMonth.getMonth() && 
               txDate.getFullYear() === lastMonth.getFullYear();
      })
      .reduce((sum, t) => {
        if (t.type === 'income') return sum + t.amount;
        if (t.type === 'expense') return sum - Math.abs(t.amount);
        return sum;
      }, 0);
  };

  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const lastMonthBalance = getLastMonthBalance();
  const percentageChange = calculatePercentageChange(totalBalance, lastMonthBalance);
  const isPositiveChange = percentageChange >= 0;

  const getLastMonthIncome = () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    return transactions
      .filter(t => {
        const txDate = new Date(t.date);
        return t.type === 'income' && 
               txDate.getMonth() === lastMonth.getMonth() && 
               txDate.getFullYear() === lastMonth.getFullYear();
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getLastMonthExpenses = () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    return transactions
      .filter(t => {
        const txDate = new Date(t.date);
        return t.type === 'expense' && 
               txDate.getMonth() === lastMonth.getMonth() && 
               txDate.getFullYear() === lastMonth.getFullYear();
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  };

  const lastMonthIncome = getLastMonthIncome();
  const incomePercentageChange = calculatePercentageChange(monthlyIncome, lastMonthIncome);
  const isIncomeUp = incomePercentageChange >= 0;

  const lastMonthExpenses = getLastMonthExpenses();
  const expensePercentageChange = calculatePercentageChange(monthlyExpenses, lastMonthExpenses);
  const isExpensesUp = expensePercentageChange >= 0;

  const calculateSavings = () => {
    const monthlyIncome = getMonthlyIncome();
    const monthlyExpenses = getMonthlyExpenses();
    const savings = monthlyIncome - monthlyExpenses;
    
    // Calculate savings rate
    const savingsRate = monthlyIncome > 0 
      ? Math.round((savings / monthlyIncome) * 100) 
      : 0;

    // Get last month's savings for comparison
    const lastMonthIncome = getLastMonthIncome();
    const lastMonthExpenses = getLastMonthExpenses();
    const lastMonthSavings = lastMonthIncome - lastMonthExpenses;
    
    // Calculate savings change percentage
    const savingsChange = calculatePercentageChange(savings, lastMonthSavings);
    
    return {
      amount: savings,
      rate: savingsRate,
      change: savingsChange,
      isPositive: savings >= 0,
      trend: savings > lastMonthSavings ? 'up' : 'down'
    };
  };

  const savingsData = calculateSavings();

  const summaryCards = [
    {
      title: "Total Balance",
      value: formatCurrency(totalBalance),
      icon: <AccountBalance />,
      color: theme.palette.primary.main
    },
    {
      title: "Monthly Income",
      value: formatCurrency(monthlyIncome),
      icon: <TrendingUp />,
      color: theme.palette.success.main
    },
    {
      title: "Monthly Expenses",
      value: formatCurrency(monthlyExpenses),
      icon: <TrendingDown />,
      color: theme.palette.error.main
    },
    {
      title: "Monthly Savings",
      value: formatCurrency(savingsData.amount),
      subtitle: savingsData.amount >= 0 
        ? `${savingsData.rate}% of income saved` 
        : 'Expenses exceed income',
      secondaryInfo: savingsData.change !== 0 && (
        <Typography 
          variant="caption" 
          sx={{ 
            color: savingsData.trend === 'up' ? 'success.main' : 'error.main',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          {savingsData.trend === 'up' ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
          {Math.abs(savingsData.change).toFixed(1)}% from last month
        </Typography>
      ),
      icon: <Savings />,
      color: savingsData.isPositive ? theme.palette.success.main : theme.palette.error.main
    }
  ];

  const handleOpenTransactionForm = (mode = 'add', data = null) => {
    setTransactionForm(prev => ({
      ...prev,
      open: true,
      mode,
      data,
      error: null
    }));
  };

  const handleCloseTransactionForm = () => {
    setTransactionForm(prev => ({
      ...prev,
      open: false,
      mode: 'add',
      data: null,
      error: null
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await handleTransactionSubmit(formData);
  };

  const handleTransactionSubmit = async (formData) => {
    setTransactionForm(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      // Special handling for transfers
      if (formData.type === 'transfer') {
        // For transfers, we need to:
        // 1. Deduct from source account (negative amount)
        // 2. Add to destination account (positive amount)
        const transferAmount = Math.abs(Number(formData.amount));

        const transferData = {
          ...formData,
          date: dayjs(formData.date).format('YYYY-MM-DD'),
          bankId,
          year,
          amount: -transferAmount, // Make amount negative for source account
          type: 'transfer',
          categoryId: null // Transfers don't need category
        };

        if (transactionForm.mode === 'edit') {
          await DatabaseService.updateTransaction(bankId, year, transferData);
        } else {
          await DatabaseService.addTransaction(bankId, year, transferData);
        }
      } else {
        // For regular transactions (income/expense)
        const amount = formData.type === 'expense' 
          ? -Math.abs(Number(formData.amount)) // Make expenses negative
          : Math.abs(Number(formData.amount));  // Keep income positive

        const transactionData = {
          ...formData,
          date: dayjs(formData.date).format('YYYY-MM-DD'),
          bankId,
          year,
          amount: amount
        };

        if (transactionForm.mode === 'edit') {
          await DatabaseService.updateTransaction(bankId, year, transactionData);
        } else {
          await DatabaseService.addTransaction(bankId, year, transactionData);
        }
      }

      handleCloseTransactionForm();
      await fetchData();
    } catch (err) {
      setTransactionForm(prev => ({ 
        ...prev, 
        error: err.message || 'Failed to save transaction' 
      }));
    } finally {
      setTransactionForm(prev => ({ ...prev, loading: false }));
    }
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'income':
        return <LocalAtm sx={{ color: 'success.main' }} />;
      case 'expense':
        return <Payment sx={{ color: 'error.main' }} />;
      case 'transfer':
        return <CompareArrows sx={{ color: 'info.main' }} />;
      default:
        return <AccountBalanceWallet />;
    }
  };

  return (
    <Container maxWidth="xl">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenTransactionForm('add')}
        >
          Add Transaction
        </Button>
      </Box>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: { xs: 2, sm: 3 },
              height: '100%'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography color="text.secondary" variant="subtitle2">
                  {summaryCards[0].title}
                </Typography>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: 1, 
                  bgcolor: `${summaryCards[0].color}15`
                }}>
                  {React.isValidElement(summaryCards[0].icon) 
                    ? React.cloneElement(summaryCards[0].icon, { sx: { color: summaryCards[0].color } })
                    : summaryCards[0].icon
                  }
                </Box>
              </Box>
              <Typography variant="h4" fontWeight="bold" sx={{ color: summaryCards[0].color }}>
                {summaryCards[0].value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: { xs: 2, sm: 3 },
              height: '100%'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography color="text.secondary" variant="subtitle2">
                  {summaryCards[1].title}
                </Typography>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: 1, 
                  bgcolor: `${summaryCards[1].color}15`
                }}>
                  {React.isValidElement(summaryCards[1].icon) 
                    ? React.cloneElement(summaryCards[1].icon, { sx: { color: summaryCards[1].color } })
                    : summaryCards[1].icon
                  }
                </Box>
              </Box>
              <Typography variant="h4" fontWeight="bold" sx={{ color: summaryCards[1].color }}>
                {summaryCards[1].value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: { xs: 2, sm: 3 },
              height: '100%'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography color="text.secondary" variant="subtitle2">
                  {summaryCards[2].title}
                </Typography>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: 1, 
                  bgcolor: `${summaryCards[2].color}15`
                }}>
                  {React.isValidElement(summaryCards[2].icon) 
                    ? React.cloneElement(summaryCards[2].icon, { sx: { color: summaryCards[2].color } })
                    : summaryCards[2].icon
                  }
                </Box>
              </Box>
              <Typography variant="h4" fontWeight="bold" sx={{ color: summaryCards[2].color }}>
                {summaryCards[2].value}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              p: { xs: 2, sm: 3 },
              height: '100%'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography color="text.secondary" variant="subtitle2">
                  {summaryCards[3].title}
                </Typography>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: 1, 
                  bgcolor: `${summaryCards[3].color}15`
                }}>
                  {React.isValidElement(summaryCards[3].icon) 
                    ? React.cloneElement(summaryCards[3].icon, { sx: { color: summaryCards[3].color } })
                    : summaryCards[3].icon
                  }
                </Box>
              </Box>
              <Typography variant="h4" fontWeight="bold" sx={{ color: summaryCards[3].color }}>
                {summaryCards[3].value}
              </Typography>
              {summaryCards[3].subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {summaryCards[3].subtitle}
                </Typography>
              )}
              {summaryCards[3].secondaryInfo && (
                <Box sx={{ mt: 1 }}>
                  {summaryCards[3].secondaryInfo}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={8}>
          <Card
            sx={{
              p: { xs: 2, sm: 3 },
              height: { xs: 'auto', md: '400px' }
            }}
          >
            {/* Monthly Trends Chart */}
            <Typography variant="h6" gutterBottom>
              Monthly Trends
            </Typography>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getMonthlyData()}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.gradient.income[0]} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={chartColors.gradient.income[1]} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.gradient.expense[0]} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={chartColors.gradient.expense[1]} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis 
                    dataKey="name" 
                    stroke={theme.palette.text.secondary}
                    style={{ fontSize: '0.75rem' }}
                  />
                  <YAxis 
                    stroke={theme.palette.text.secondary}
                    style={{ fontSize: '0.75rem' }}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8
                    }}
                    formatter={(value) => [formatCurrency(value), '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke={chartColors.income}
                    fill="url(#colorIncome)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke={chartColors.expense}
                    fill="url(#colorExpenses)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Recent Activity</Typography>
                <Button 
                  size="small" 
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/transactions')}
                >
                  View All
                </Button>
              </Box>
              <Stack spacing={2}>
                {transactions.slice(0, 5).map((transaction) => {
                  const isTransfer = transaction.type === 'transfer';
                  const toAccount = isTransfer ? accounts.find(acc => acc.accountId === transaction.toAccountId)?.name : '';
                  const fromAccount = isTransfer ? accounts.find(acc => acc.accountId === transaction.accountId)?.name : '';
                  
                  return (
                    <Box
                      key={transaction.transactionId}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                        '&:hover': {
                          bgcolor: 'action.hover',
                          cursor: 'pointer'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ 
                          p: 1, 
                          borderRadius: 2, 
                          bgcolor: 'background.default',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {getTransactionIcon(transaction.type)}
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {transaction.description}
                          </Typography>
                          {isTransfer ? (
                            <Typography variant="body2" color="text.secondary">
                              {fromAccount} → {toAccount}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              {dayjs(transaction.date).format('MMM D, YYYY')}
                            </Typography>
                          )}
                        </Box>
                      </Box>
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
                          label={transaction.type === 'transfer' ? 'Transfer' : 
                                 transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          size="small"
                          sx={{
                            bgcolor: transaction.type === 'income' ? 'success.soft' : 
                                    transaction.type === 'expense' ? 'error.soft' : 
                                    'info.soft',
                            color: transaction.type === 'income' ? 'success.main' : 
                                   transaction.type === 'expense' ? 'error.main' : 
                                   'info.main',
                            fontWeight: 500
                          }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Accounts Overview */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Accounts Overview
                </Typography>
                <IconButton 
                  size="small"
                  onClick={() => navigate('/accounts')}
                >
                  <MoreVert />
                </IconButton>
              </Box>
              <Stack spacing={2}>
                {accounts.map((account) => (
                  <Box
                    key={account.accountId}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'background.default',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        cursor: 'pointer'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: account.colorCode || theme.palette.primary.main,
                          color: 'white'
                        }}
                      >
                        {account.icon || <AccountBalance />}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                          {account.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 500,
                          color: account.currentBalance >= 0 ? 'success.main' : 'error.main'
                        }}
                      >
                        {formatCurrency(account.currentBalance)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {account.currency}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddIcon />}
                sx={{ mt: 3 }}
                onClick={() => navigate('/accounts')}
              >
                Add Account
              </Button>
            </CardContent>
          </Card>

          {/* Expense Categories Chart */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Expense Categories
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getCategoryData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getCategoryData().map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`
                      }}
                      formatter={(value) => [formatCurrency(value), '']}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span style={{ color: theme.palette.text.primary }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog 
        open={transactionForm.open} 
        onClose={handleCloseTransactionForm}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {transactionForm.mode === 'edit' ? 'Edit Transaction' : 'Add New Transaction'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
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
                  <TextField
                    fullWidth
                    label="Amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    inputProps={{ step: "0.01" }}
                  />
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
            </LocalizationProvider>

            {transactionForm.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {transactionForm.error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseTransactionForm}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={transactionForm.loading}
            >
              {transactionForm.mode === 'edit' ? 'Update' : 'Add'} Transaction
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default Dashboard;