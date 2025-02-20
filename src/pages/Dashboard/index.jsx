import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  Chip,
  Stack,
  Button,
  useTheme
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  MoreVert,
  Add as AddIcon,
  ArrowUpward,
  ArrowDownward
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
import TransactionForm from '../../components/TransactionForm';

const Dashboard = () => {
  const theme = useTheme();
  const { currentBank, currentYear } = useApp();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [currentBank, currentYear]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      const [accountsData, transactionsData, categoriesData] = await Promise.all([
        DatabaseService.getAccounts(bankId, year),
        DatabaseService.getTransactions(bankId, year),
        DatabaseService.getCategories(bankId, year)
      ]);

      setAccounts(accountsData);
      setTransactions(transactionsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsTransactionFormOpen(true)}
        >
          Add Transaction
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary" variant="subtitle2">
                  Total Balance
                </Typography>
                <IconButton size="small">
                  <MoreVert />
                </IconButton>
              </Box>
              <Typography variant="h4" fontWeight="bold">
                ${getTotalBalance().toLocaleString()}
              </Typography>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                <Chip
                  icon={<TrendingUp />}
                  label="4.5% up"
                  size="small"
                  color="success"
                  sx={{ mr: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  vs last month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary" variant="subtitle2">
                  Monthly Income
                </Typography>
                <ArrowUpward color="success" />
              </Box>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                ${getMonthlyIncome().toLocaleString()}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={70}
                color="success"
                sx={{ mt: 2, mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                70% of monthly goal
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary" variant="subtitle2">
                  Monthly Expenses
                </Typography>
                <ArrowDownward color="error" />
              </Box>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                ${getMonthlyExpenses().toLocaleString()}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={85}
                color="error"
                sx={{ mt: 2, mb: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                85% of monthly budget
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Trends Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Monthly Trends
              </Typography>
              <Box sx={{ height: 300, mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getMonthlyData()}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0}/>
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
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`
                      }}
                      formatter={(value) => [`$${value}`, '']}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke={theme.palette.success.main}
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke={theme.palette.error.main}
                      fillOpacity={1}
                      fill="url(#colorExpenses)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Expense Categories Chart */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
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
                      formatter={(value) => [`$${value}`, '']}
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

        {/* Activity Section with Bar Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Recent Activity
                </Typography>
                <Chip
                  label={`${getActivityProgress().toFixed(0)}%`}
                  color="primary"
                  size="small"
                />
              </Box>

              {/* Daily Transactions Chart */}
              <Box sx={{ height: 200, mb: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transactions.slice(0, 7).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="date" 
                      stroke={theme.palette.text.secondary}
                      style={{ fontSize: '0.75rem' }}
                    />
                    <YAxis
                      stroke={theme.palette.text.secondary}
                      style={{ fontSize: '0.75rem' }}
                      tickFormatter={(value) => `$${Math.abs(value)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`
                      }}
                      formatter={(value) => [`$${Math.abs(value)}`, '']}
                    />
                    <Bar 
                      dataKey="amount"
                      fill={theme.palette.primary.main}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              {/* Recent Transactions List */}
              <Stack spacing={2}>
                {transactions.slice(0, 5).map((transaction) => (
                  <Box
                    key={transaction.transactionId}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'background.subtle'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="subtitle1">
                        {transaction.description}
                      </Typography>
                      <Chip
                        label={transaction.type}
                        size="small"
                        color={transaction.type === 'income' ? 'success' : 'error'}
                      />
                    </Box>
                    <Typography
                      variant="subtitle1"
                      color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      ${Math.abs(transaction.amount).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TransactionForm
        open={isTransactionFormOpen}
        onClose={() => setIsTransactionFormOpen(false)}
        onSubmit={loadDashboardData}
        accounts={accounts}
        categories={categories}
      />
    </Box>
  );
};

export default Dashboard; 