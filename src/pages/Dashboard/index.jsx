import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  useMediaQuery,
  Avatar
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
  Add as AddIcon,
  Close as CloseIcon,
  GetApp as GetAppIcon
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
const isPWAInstalled = isStandalone || window.matchMedia('(display-mode: minimal-ui)').matches;
const isPWACompatible = 'serviceWorker' in navigator && !isPWAInstalled;

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
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    savingsPercentage: 0
  });
  const [reportData, setReportData] = useState({});

  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      const month = new Date().getMonth();

      const [transactionsData, accountsData, categoriesData, monthlyStats] = await Promise.all([
        DatabaseService.getMonthTransactions(bankId, year, month),
        DatabaseService.getAccounts(bankId, year),
        DatabaseService.getCategories(bankId, year),
        DatabaseService.getMonthlyStats(bankId, year, month)
      ]);

      setAccounts(accountsData);
      setTransactions(transactionsData.transactions || []);
      setCategories(categoriesData);
      setMonthlyStats(monthlyStats);

      // Prepare chart data with account balances from accounts table
      const chartData = {
        expensesByCategory: calculateExpensesByCategory(transactionsData.transactions || [], categoriesData),
        incomeByCategory: calculateIncomeByCategory(transactionsData.transactions || [], categoriesData),
        cashFlow: calculateCashFlow(transactionsData.transactions || []),
        accountBalances: calculateAccountBalances(accountsData),
        dailyTrends: calculateDailyTrends(transactionsData.transactions || [])
      };

      setReportData(prevData => ({
        ...prevData,
        ...chartData
      }));

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentBank, currentYear]);

  useEffect(() => {
    // Don't show if already installed
    if (isPWAInstalled) {
      setShowInstallPrompt(false);
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      // Store the event for later use
      setDeferredPrompt(e);
      
      if (isMobileDevice) {
        // For mobile: show if not dismissed and not installed
        if (!sessionStorage.getItem('installPromptDismissed')) {
          setShowInstallPrompt(true);
        }
      } else {
        // For desktop: show only once
        if (!localStorage.getItem('desktopPromptShown')) {
          setShowInstallPrompt(true);
        }
      }
    };

    // Initial check for showing prompt
    if (isMobileDevice) {
      if (!sessionStorage.getItem('installPromptDismissed') && !isPWAInstalled) {
        setShowInstallPrompt(true);
      }
    } else if (!localStorage.getItem('desktopPromptShown')) {
      setShowInstallPrompt(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    window.addEventListener('appinstalled', () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      if (isMobileDevice) {
        sessionStorage.setItem('installPromptDismissed', 'true');
      } else {
        localStorage.setItem('desktopPromptShown', 'true');
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    try {
      if (!deferredPrompt) {
        // If no deferred prompt, try to trigger the browser's install prompt
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          await registration.update();
          
          // Create and dispatch a new beforeinstallprompt event
          const event = new Event('beforeinstallprompt');
          window.dispatchEvent(event);
        }
        return;
      }

      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user choice
      const choiceResult = await deferredPrompt.userChoice;
      console.log('User choice:', choiceResult.outcome);

      if (choiceResult.outcome === 'accepted') {
        setShowInstallPrompt(false);
        if (isMobileDevice) {
          sessionStorage.setItem('installPromptDismissed', 'true');
        } else {
          localStorage.setItem('desktopPromptShown', 'true');
        }
      }
    } catch (error) {
      console.error('Installation error:', error);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleSkipInstall = () => {
    setShowInstallPrompt(false);
    if (isMobileDevice) {
      sessionStorage.setItem('installPromptDismissed', 'true');
    } else {
      localStorage.setItem('desktopPromptShown', 'true');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.code
    }).format(amount);
  };

  const balanceStats = useMemo(() => {
    if (!accounts || !transactions) return {
      totalBalance: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      monthlySavings: 0,
      savingsRate: 0
    };

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const totalBalance = accounts.reduce((sum, account) => sum + account.currentBalance, 0);

    const currentMonthTransactions = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate.getMonth() === currentMonth && 
             txDate.getFullYear() === currentYear &&
             t.type !== 'transfer'; // Exclude transfer transactions
    });

    const monthlyIncome = currentMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const monthlyExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const monthlySavings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0;

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      savingsRate
    };
  }, [accounts, transactions]);

  const categoryData = useMemo(() => {
    if (!transactions || !categories) return [];

    const categoryTotals = new Map();
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const category = categories.find(c => c.categoryId === transaction.categoryId);
        if (category) {
          const currentTotal = categoryTotals.get(category.name) || 0;
          categoryTotals.set(category.name, currentTotal + Math.abs(transaction.amount));
        }
      });

    return Array.from(categoryTotals.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [transactions, categories]);

  const monthlyData = useMemo(() => {
    if (!transactions) return [];

    const monthlyMap = new Map();
    const year = currentYear || new Date().getFullYear();

    for (let month = 0; month < 12; month++) {
      const date = new Date(year, month, 1);
      const monthKey = dayjs(date).format('YYYY-MM');
      monthlyMap.set(monthKey, {
        month: dayjs(date).format('MMM'),
        income: 0,
        expenses: 0,
        netFlow: 0
      });
    }

    transactions.forEach(transaction => {
      const transactionDate = dayjs(transaction.date);
      if (transactionDate.year() === year) {
        const monthKey = transactionDate.format('YYYY-MM');
        const monthData = monthlyMap.get(monthKey);
        
        if (monthData) {
          if (transaction.type === 'income') {
            monthData.income += Math.abs(transaction.amount);
          } else if (transaction.type === 'expense') {
            monthData.expenses += Math.abs(transaction.amount);
          }
          monthData.netFlow = monthData.income - monthData.expenses;
        }
      }
    });

    return Array.from(monthlyMap.entries())
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([_, data]) => data);
  }, [transactions, currentYear]);

  const totalBalance = balanceStats.totalBalance;
  const monthlyIncome = balanceStats.monthlyIncome;
  const monthlyExpenses = balanceStats.monthlyExpenses;
  const monthlySavings = balanceStats.monthlySavings;
  const savingsRate = balanceStats.savingsRate;

  const getLastMonthBalance = () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const lastMonthTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate.getMonth() === lastMonth.getMonth() && 
               txDate.getFullYear() === lastMonth.getFullYear();
    });

    const lastMonthIncome = lastMonthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const lastMonthExpenses = lastMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return lastMonthIncome - lastMonthExpenses;
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
    const currentMonthIncome = balanceStats.monthlyIncome;
    const currentMonthExpenses = balanceStats.monthlyExpenses;
    const savingsAmount = currentMonthIncome - currentMonthExpenses;
    const savingsRate = currentMonthIncome > 0 ? (savingsAmount / currentMonthIncome) * 100 : 0;
    
    const lastMonthBalance = getLastMonthBalance();
    const savingsChange = lastMonthBalance !== 0 ? 
      ((savingsAmount - lastMonthBalance) / Math.abs(lastMonthBalance)) * 100 : 0;
    
    return {
      amount: savingsAmount,
      rate: Math.round(savingsRate),
      change: savingsChange,
      trend: savingsChange >= 0 ? 'up' : 'down',
      isPositive: savingsAmount >= 0
    };
  };

  const topCategory = useMemo(() => {
    if (!categoryData.length) return { name: 'No Data', percentage: 0 };
    
    const totalExpenses = categoryData.reduce((sum, cat) => sum + cat.value, 0);
    const topCat = categoryData[0];
    
    return {
      name: topCat.name,
      percentage: totalExpenses > 0 ? (topCat.value / totalExpenses) * 100 : 0
    };
  }, [categoryData]);

  const savingsData = calculateSavings();

  const summaryCards = [
    {
      title: "Total Balance",
      value: formatCurrency(totalBalance),
      icon: <AccountBalance />,
      color: theme.palette.primary.main,
      change: percentageChange,
      trend: isPositiveChange ? 'up' : 'down'
    },
    {
      title: "Monthly Income",
      value: formatCurrency(monthlyIncome),
      icon: <TrendingUp />,
      color: theme.palette.success.main,
      change: monthlyStats.income,
      trend: monthlyStats.income >= 0 ? 'up' : 'down'
    },
    {
      title: "Monthly Expenses",
      value: formatCurrency(monthlyExpenses),
      icon: <TrendingDown />,
      color: theme.palette.error.main,
      change: monthlyStats.expenses,
      trend: monthlyStats.expenses >= 0 ? 'up' : 'down'
    },
    {
      title: "Monthly Savings",
      value: formatCurrency(monthlyStats.savings),
      subtitle: monthlyStats.savings >= 0 
        ? `${monthlyStats.savingsPercentage}% of income saved` 
        : 'Expenses exceed income',
      secondaryInfo: monthlyStats.savings !== 0 && (
        <Typography 
          variant="caption" 
          sx={{ 
            color: monthlyStats.savings >= 0 ? 'success.main' : 'error.main',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          {monthlyStats.savings >= 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
          {Math.abs(monthlyStats.savings).toFixed(1)}% from last month
        </Typography>
      ),
      icon: <Savings />,
      color: monthlyStats.savings >= 0 ? theme.palette.success.main : theme.palette.error.main
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

  const getRecentTransactions = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) return [];

    return transactions
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      })
      .slice(0, 5); // Get only the 5 most recent transactions
  }, [transactions]);

  const calculateExpensesByCategory = (transactions, categories) => {
    if (!transactions || !categories) return [];

    const expensesByCategory = new Map();
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(transaction => {
        const category = categories.find(c => c.categoryId === transaction.categoryId);
        if (category) {
          const currentTotal = expensesByCategory.get(category.name) || 0;
          expensesByCategory.set(category.name, currentTotal + Math.abs(transaction.amount));
        }
      });

    return Array.from(expensesByCategory.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const calculateIncomeByCategory = (transactions, categories) => {
    if (!transactions || !categories) return [];

    const incomeByCategory = new Map();
    
    transactions
      .filter(t => t.type === 'income')
      .forEach(transaction => {
        const category = categories.find(c => c.categoryId === transaction.categoryId);
        if (category) {
          const currentTotal = incomeByCategory.get(category.name) || 0;
          incomeByCategory.set(category.name, currentTotal + Math.abs(transaction.amount));
        }
      });

    return Array.from(incomeByCategory.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  };

  const calculateCashFlow = (transactions) => {
    if (!transactions) return [];

    const cashFlowByDay = new Map();
    
    transactions
      .filter(t => t.type !== 'transfer')
      .forEach(transaction => {
        const date = dayjs(transaction.date).format('YYYY-MM-DD');
        if (!cashFlowByDay.has(date)) {
          cashFlowByDay.set(date, { income: 0, expenses: 0, net: 0 });
        }
        
        const flow = cashFlowByDay.get(date);
        const amount = Math.abs(transaction.amount);
        
        if (transaction.type === 'income') {
          flow.income += amount;
        } else {
          flow.expenses += amount;
        }
        flow.net = flow.income - flow.expenses;
      });

    return Array.from(cashFlowByDay.entries())
      .map(([date, values]) => ({
        date,
        ...values
      }))
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  };

  const calculateAccountBalances = (accounts) => {
    if (!accounts) return [];
    
    return accounts.map(account => ({
      name: account.name,
      balance: account.currentBalance
    }));
  };

  const calculateDailyTrends = (transactions) => {
    if (!transactions) return [];

    const dailyTotals = new Map();
    
    transactions
      .filter(t => t.type !== 'transfer')
      .forEach(transaction => {
        const date = dayjs(transaction.date).format('YYYY-MM-DD');
        if (!dailyTotals.has(date)) {
          dailyTotals.set(date, { date, total: 0 });
        }
        
        const daily = dailyTotals.get(date);
        const amount = transaction.type === 'income' ? 
          Math.abs(transaction.amount) : 
          -Math.abs(transaction.amount);
        
        daily.total += amount;
      });

    return Array.from(dailyTotals.values())
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  };

  return (
    <Container 
      maxWidth="2xl" 
      sx={{ 
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2, md: 3 }
      }}
    >
      {showInstallPrompt && (
        <Card 
          sx={{ 
            mb: 3, 
            bgcolor: 'primary.soft',
            borderRadius: 2,
            boxShadow: 2
          }}
        >
          <CardContent>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  Install ExpenseGo
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isMobileDevice 
                    ? 'Add to your home screen for quick access'
                    : 'Install as a desktop app for better experience'
                  }
                </Typography>
                {error && (
                  <Typography 
                    variant="caption" 
                    color="error" 
                    sx={{ display: 'block', mt: 1 }}
                  >
                    {error}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleInstallClick}
                  startIcon={<AddIcon />}
                >
                  Install
                </Button>
                <Button
                  size="small"
                  onClick={handleSkipInstall}
                  startIcon={<CloseIcon />}
                >
                  {isMobileDevice ? 'Skip' : 'Maybe Later'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

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
      <Grid 
        container 
        spacing={{ xs: 3, sm: 3, md: 4 }}
      >
        {/* Charts Section */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ 
            mb: { xs: 3, sm: 4 },
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
                '.recharts-cartesian-grid-horizontal line:last-of-type': {
                  strokeOpacity: 0
                },
                '.recharts-cartesian-grid-vertical line:first-of-type, .recharts-cartesian-grid-vertical line:last-of-type': {
                  strokeOpacity: 0
                }
              }}>
                <ResponsiveContainer>
                  <AreaChart 
                    data={monthlyData}
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
                      dataKey="month" 
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

          {/* Recent Activity */}
          <Card sx={{ 
            boxShadow: DASHBOARD_STYLES.cardShadow,
            mb: { xs: 3, sm: 4 }
          }}>
            <CardContent>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 2 
              }}>
                <Typography variant="h6">Recent Activity</Typography>
                <Button 
                  size="small" 
                  onClick={() => navigate('/transactions')}
                  sx={{ textTransform: 'none' }}
                >
                  View All
                </Button>
              </Box>
              <Stack spacing={2}>
                {getRecentTransactions.map((transaction) => {
                  const account = accounts.find(a => a.accountId === transaction.accountId);
                  const category = categories.find(c => c.categoryId === transaction.categoryId);
                  
                  return (
                    <Box
                      key={transaction.transactionId}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderRadius: 1,
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Avatar
                          sx={{
                            bgcolor: transaction.type === 'income' ? 'success.soft' :
                                    transaction.type === 'expense' ? 'error.soft' :
                                    'info.soft',
                            width: 40,
                            height: 40
                          }}
                        >
                          {getTransactionIcon(transaction.type)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
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
                            <Tooltip title="Account">
                              <Typography variant="caption" color="text.secondary">
                                • {account?.name}
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
            mb: { xs: 3, sm: 4 },
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
          <Card sx={{ 
            boxShadow: DASHBOARD_STYLES.cardShadow,
            mb: { xs: 3, sm: 4 }
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Expense Categories
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
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