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
  TextField,
  useMediaQuery
} from '@mui/material';
import {
  TrendingUp,
  MoreVert,
  AccountBalance,
  TrendingDown,
  Savings,
  CompareArrows,
  Payment,
  AccountBalanceWallet,
  LocalAtm,
  ArrowForward,
  Add as AddIcon
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
  income: '#10B981',
  expense: '#EF4444',
  transfer: '#2196F3',
  gradient: {
    income: ['rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.0)'],
    expense: ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.0)']
  }
};

const DASHBOARD_STYLES = {
  cardShadow: {
    xs: '0 2px 4px rgba(0,0,0,0.1)',
    md: '0 4px 8px rgba(0,0,0,0.12)'
  },
  gradients: {
    primary: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    error: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    info: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
  }
};

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentBank, currentYear } = useApp();
  const [accounts, setAccounts] = useState([]);
  const { currency } = useRegion();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    const monthlyData = [];
    const year = currentYear || new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Calculate how many months to show (minimum 6)
    const monthsToShow = Math.max(6, currentMonth + 1);
    
    // Get data for all months up to current month
    for (let i = 0; i < 12; i++) {
      const month = new Date(year, i, 1);
      
      // For past and current months, calculate actual data
      if (i <= currentMonth) {
        const monthIncome = transactions
          .filter(t => {
            const txDate = new Date(t.date);
            return t.type === 'income' && 
                   txDate.getMonth() === month.getMonth() && 
                   txDate.getFullYear() === month.getFullYear();
          })
          .reduce((sum, t) => sum + t.amount, 0);

        const monthExpenses = transactions
          .filter(t => {
            const txDate = new Date(t.date);
            return t.type === 'expense' && 
                   txDate.getMonth() === month.getMonth() && 
                   txDate.getFullYear() === month.getFullYear();
          })
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        monthlyData.push({
          name: month.toLocaleString('default', { month: 'short' }),
          income: monthIncome,
          expenses: monthExpenses,
          balance: monthIncome - monthExpenses
        });
      } else {
        // For future months, show zero values
        monthlyData.push({
          name: month.toLocaleString('default', { month: 'short' }),
          income: 0,
          expenses: 0,
          balance: 0
        });
      }
    }

    return monthlyData;
  };

  const getCategoryData = () => {
    const categoryTotals = {};
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const category = categories.find(c => c.categoryId === transaction.categoryId);
        if (category) {
          if (!categoryTotals[category.name]) {
            categoryTotals[category.name] = 0;
          }
          categoryTotals[category.name] += Math.abs(transaction.amount);
        }
      });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Show top 5 categories
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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
      .reduce((balance, t) => {
        if (t.type === 'income') return balance + t.amount;
        if (t.type === 'expense') return balance - Math.abs(t.amount);
        return balance;
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
    <Container 
      maxWidth="2xl" 
      sx={{ 
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2, md: 3 }
      }}
    >
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Dashboard
        </Typography>
      </Box>

      {/* Summary Cards Grid */}
      <Grid 
        container 
        spacing={{ xs: 2, sm: 3 }}
        sx={{ mb: { xs: 2, sm: 3, md: 4 } }}
      >
        {summaryCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={card.title}>
            <Card
              sx={{
                height: '100%',
                background: index === 0 ? DASHBOARD_STYLES.gradients.primary :
                           index === 1 ? DASHBOARD_STYLES.gradients.success :
                           index === 2 ? DASHBOARD_STYLES.gradients.error :
                           DASHBOARD_STYLES.gradients.info,
                color: 'white',
                boxShadow: DASHBOARD_STYLES.cardShadow,
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)'
                }
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 2 
                }}>
                  <Typography 
                    sx={{ 
                      fontSize: '1rem',
                      opacity: 0.9
                    }}
                  >
                    {card.title}
                  </Typography>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 1,
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }}>
                    {card.icon}
                  </Box>
                </Box>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontSize: { xs: '1.5rem', sm: '2rem' },
                    fontWeight: 600,
                    mb: 1
                  }}
                >
                  {card.value}
                </Typography>
                {card.subtitle && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      opacity: 0.9,
                      fontSize: '0.875rem'
                    }}
                  >
                    {card.subtitle}
                  </Typography>
                )}
                {card.secondaryInfo && (
                  <Box sx={{ mt: 1, opacity: 0.9 }}>
                    {card.secondaryInfo}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {/* Charts Section */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ 
            mb: { xs: 2, sm: 3 },
            boxShadow: DASHBOARD_STYLES.cardShadow
          }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 3 
              }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontSize: { xs: '1.1rem', sm: '1.25rem' },
                    fontWeight: 600
                  }}
                >
                  Monthly Trends
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        bgcolor: chartColors.income 
                      }} 
                    />
                    <Typography variant="caption" color="text.secondary">Income</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        bgcolor: chartColors.expense 
                      }} 
                    />
                    <Typography variant="caption" color="text.secondary">Expenses</Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ 
                height: { xs: 300, sm: 350, md: 400 },
                width: '100%',
                '.recharts-cartesian-grid-horizontal line:last-child': {
                  strokeOpacity: 0
                },
                '.recharts-cartesian-grid-vertical line:first-child, .recharts-cartesian-grid-vertical line:last-child': {
                  strokeOpacity: 0
                }
              }}>
                <ResponsiveContainer>
                  <AreaChart 
                    data={getMonthlyData()}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop 
                          offset="5%" 
                          stopColor={chartColors.income} 
                          stopOpacity={0.2}
                        />
                        <stop 
                          offset="95%" 
                          stopColor={chartColors.income} 
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop 
                          offset="5%" 
                          stopColor={chartColors.expense} 
                          stopOpacity={0.2}
                        />
                        <stop 
                          offset="95%" 
                          stopColor={chartColors.expense} 
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke={theme.palette.divider}
                      opacity={0.5}
                    />
                    <XAxis 
                      dataKey="name" 
                      stroke={theme.palette.text.secondary}
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: theme.palette.divider }}
                    />
                    <YAxis 
                      stroke={theme.palette.text.secondary}
                      fontSize={12}
                      tickLine={false}
                      axisLine={{ stroke: theme.palette.divider }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 8,
                        boxShadow: theme.shadows[3]
                      }}
                      formatter={(value) => [formatCurrency(value), '']}
                      labelStyle={{ color: theme.palette.text.primary }}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke={chartColors.income}
                      strokeWidth={2}
                      fill="url(#incomeGradient)"
                      dot={{
                        stroke: chartColors.income,
                        strokeWidth: 2,
                        fill: theme.palette.background.paper,
                        r: 4
                      }}
                      activeDot={{
                        stroke: chartColors.income,
                        strokeWidth: 2,
                        fill: theme.palette.background.paper,
                        r: 6
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke={chartColors.expense}
                      strokeWidth={2}
                      fill="url(#expenseGradient)"
                      dot={{
                        stroke: chartColors.expense,
                        strokeWidth: 2,
                        fill: theme.palette.background.paper,
                        r: 4
                      }}
                      activeDot={{
                        stroke: chartColors.expense,
                        strokeWidth: 2,
                        fill: theme.palette.background.paper,
                        r: 6
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>

          {/* Recent Activity Card */}
          <Card sx={{ boxShadow: DASHBOARD_STYLES.cardShadow }}>
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 3 
              }}>
                <Typography 
                  variant="h6"
                  sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                >
                  Recent Activity
                </Typography>
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
        <Grid item xs={12} lg={4}>
          {/* Accounts Overview Card */}
          <Card sx={{ 
            mb: { xs: 2, sm: 3 },
            boxShadow: DASHBOARD_STYLES.cardShadow
          }}>
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
          <Card sx={{ boxShadow: DASHBOARD_STYLES.cardShadow }}>
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
    </Container>
  );
};

export default Dashboard;