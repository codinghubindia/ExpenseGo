import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  useTheme,
  Tooltip,
  Alert,
  Chip,
  IconButton,
  Switch
} from '@mui/material';
import {
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Area,
  AreaChart,
  BarChart,
  Bar,
  ComposedChart,
  Line
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import DatabaseService from '../../services/DatabaseService';
import {
  Add as AddIcon,
  ArrowUpward,
  ArrowDownward,
  TrendingUp,
  TrendingDown,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useApp } from '../../contexts/AppContext';
import { useRegion } from '../../contexts/RegionContext';

const Reports = () => {
  const theme = useTheme();
  const { currentBank, currentYear } = useApp();
  const { currency } = useRegion();

  // Move generateMonthlyLabels to the top
  const generateMonthlyLabels = () => {
    const months = [];
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 12; i++) {
      months.push(dayjs(new Date(currentYear, i, 1)).format('YYYY-MM-DD'));
    }
    return months;
  };

  // Now we can use generateMonthlyLabels in our state initializations
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [timeframe, setTimeframe] = useState('month');
  const [reportData, setReportData] = useState({
    summary: {
      totalIncome: 0,
      totalExpenses: 0,
      netIncome: 0,
      topExpenseCategory: '',
      topIncomeSource: '',
      monthlyGrowth: 0
    },
    expensesByCategory: [],
    incomeByCategory: [],
    cashFlow: generateMonthlyLabels().map(date => ({
      date,
      income: 0,
      expenses: 0,
      netFlow: 0
    })),
    accountBalances: [],
    dailyTrends: generateMonthlyLabels().map(date => ({
      date,
      income: 0,
      expenses: 0
    }))
  });
  const [customReportDialog, setCustomReportDialog] = useState(false);
  const [customReport, setCustomReport] = useState({
    enabled: false,
    name: '',
    description: '',
    type: 'expenses',
    groupBy: 'category',
    timeframe: 'month',
    paperSize: 'A4',
    orientation: 'PORTRAIT',
    includeCharts: true,
    includeSummary: true,
    headers: [],
    customStartDate: dayjs(),
    customEndDate: dayjs(),
    filters: {}
  });

  // Add new state for export filters
  const [exportFilters, setExportFilters] = useState({
    accounts: [],
    categories: [],
    startDate: dayjs().startOf('month'),
    endDate: dayjs().endOf('month'),
    transactionTypes: ['expense', 'income', 'transfer']
  });

  // Add state for available accounts and categories
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  const COLORS = useMemo(() => [
    '#FF6B6B', // Coral Red
    '#4ECDC4', // Turquoise
    '#45B7D1', // Sky Blue
    '#7C8CE3', // Periwinkle
    '#9B6B9E', // Plum
    '#5AB9A8', // Sea Green
    '#5D78FF', // Royal Blue
    '#64B5F6', // Light Blue
    '#81C784', // Light Green
    '#7986CB'  // Indigo
  ], []);

  // Add menuItems definition
  const reportTypes = [
    { text: 'Expense Analysis', value: 'expenses' },
    { text: 'Income Analysis', value: 'income' },
    { text: 'Cash Flow', value: 'cashflow' },
    { text: 'Account Balances', value: 'balance' }
  ];

  // Add error state
  const [error, setError] = useState(null);

  // Add success state at the top with other states
  const [success, setSuccess] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  // Move monthlyStats and topCategory inside useEffect
  const [monthlyStats, setMonthlyStats] = useState({
    totalIncome: { amount: 0, change: 0 },
    totalExpenses: { amount: 0, change: 0 },
    netIncome: { amount: 0, change: 0 }
  });
  const [topCategory, setTopCategory] = useState({ name: 'No data', percentage: 0 });

  // First, add these chart style constants at the top of the component
  const chartStyles = {
    pieChart: {
      style: {
        background: 'transparent'
      }
    },
    areaChart: {
      style: {
        background: 'transparent'
      }
    }
  };

  useEffect(() => {
    loadReportData();
  }, [currentBank, currentYear]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      // Add accounts to the Promise.all
      const [transactionsData, categoriesData, accountsData] = await Promise.all([
        DatabaseService.getTransactions(bankId, year),
        DatabaseService.getCategories(bankId, year),
        DatabaseService.getAccounts(bankId, year)
      ]);

      if (!Array.isArray(transactionsData) || !Array.isArray(categoriesData) || !Array.isArray(accountsData)) {
        throw new Error('Invalid data received from database');
      }

      setTransactions(transactionsData);
      setCategories(categoriesData);

      // Calculate stats after data is loaded
      const stats = getMonthlyComparison(transactionsData);
      const topCat = getTopCategory(transactionsData, categoriesData);
      
      // Prepare chart data with account balances from accounts table
      const chartData = {
        expensesByCategory: calculateExpensesByCategory(transactionsData, categoriesData),
        incomeByCategory: calculateIncomeByCategory(transactionsData, categoriesData),
        cashFlow: calculateCashFlow(transactionsData),
        accountBalances: calculateAccountBalances(accountsData), // Pass accounts data instead
        dailyTrends: calculateDailyTrends(transactionsData)
      };
      
      setReportData(prevData => ({
        ...prevData,
        ...chartData
      }));
      setMonthlyStats(stats);
      setTopCategory(topCat);
    } catch (err) {
      console.error('Error loading report data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update helper functions to accept data as parameters
  const getTopCategory = (transactions, categories) => {
    const categoryExpenses = new Map();
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const category = categories.find(c => c.categoryId === t.categoryId);
        if (category) {
          const currentAmount = categoryExpenses.get(category.categoryId) || 0;
          categoryExpenses.set(category.categoryId, currentAmount + Math.abs(t.amount));
        }
      });

    if (categoryExpenses.size === 0) return { name: 'No data', percentage: 0 };

    const topCategoryId = [...categoryExpenses.entries()]
      .sort((a, b) => b[1] - a[1])[0][0];
    
    const topCategory = categories.find(c => c.categoryId === topCategoryId);
    const topAmount = categoryExpenses.get(topCategoryId);
    const percentage = totalExpenses > 0 ? (topAmount / totalExpenses) * 100 : 0;

    return {
      name: topCategory?.name || 'No data',
      percentage: percentage
    };
  };

  const getMonthlyComparison = (transactions) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const currentMonthData = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate.getMonth() === currentMonth && 
             txDate.getFullYear() === currentYear;
    });

    const lastMonthData = transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate.getMonth() === (currentMonth - 1) && 
             txDate.getFullYear() === currentYear;
    });

    const getCurrentTotal = (type) => currentMonthData
      .filter(t => t.type === type)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const getLastTotal = (type) => lastMonthData
      .filter(t => t.type === type)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const currentIncome = getCurrentTotal('income');
    const lastIncome = getLastTotal('income');
    const incomeChange = calculateChange(currentIncome, lastIncome);

    const currentExpenses = getCurrentTotal('expense');
    const lastExpenses = getLastTotal('expense');
    const expensesChange = calculateChange(currentExpenses, lastExpenses);

    const currentNet = currentIncome - currentExpenses;
    const lastNet = lastIncome - lastExpenses;
    const netChange = calculateChange(currentNet, lastNet);

    return {
      totalIncome: {
        amount: currentIncome,
        change: incomeChange
      },
      totalExpenses: {
        amount: currentExpenses,
        change: expensesChange
      },
      netIncome: {
        amount: currentNet,
        change: netChange
      }
    };
  };

  // In the Reports component, define formatCurrency using the currency from context
  const formatCurrency = useCallback((amount) => {
    if (typeof amount !== 'number') {
      return currency.symbol + '0';
    }
  
    const options = {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    };
  
    // For Indian Rupee (INR), use Indian number format
    if (currency.code === 'INR') {
      options.notation = 'standard';
      options.numberingSystem = 'latn';
    }
  
    try {
      return new Intl.NumberFormat(currency.locale || 'en-US', options).format(amount);
    } catch (error) {
      console.error('Currency formatting error:', error);
      // Fallback formatting
      return `${currency.symbol}${amount.toFixed(2)}`;
    }
  }, [currency]);

  // Update CustomTooltip component
  const CustomTooltip = useCallback(({ active, payload, label, type }) => {
    if (active && payload && payload.length) {
      return (
        <Box sx={{
          bgcolor: 'background.paper',
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          boxShadow: 3
        }}>
          <Typography variant="subtitle2" gutterBottom>
            {dayjs(label).format('MMMM YYYY')}
          </Typography>
          {payload.map((entry, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: entry.color || (entry.dataKey === 'expenses' ? '#FF6B6B' : '#4CAF50')
                }}
              />
              <Typography variant="body2">
                {`${entry.name || (entry.dataKey === 'expenses' ? 'Expenses' : 'Income')}: ${formatCurrency(Math.abs(entry.value))}`}
              </Typography>
            </Box>
          ))}
        </Box>
      );
    }
    return null;
  }, [formatCurrency]);

  // Update the fetchTransactionsForExport function
  const fetchTransactionsForExport = async () => {
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      // Get accounts first to get current balances
      const accounts = await DatabaseService.getAccounts(bankId, year);
      const categories = await DatabaseService.getCategories(bankId, year);

      // Get all transactions for each account to calculate running balance
      let allTransactions = [];
      for (const account of accounts) {
        const accountTransactions = await DatabaseService.getTransactions(bankId, year, {
          accountIds: [account.accountId]
        });

        // Sort transactions by date in ascending order
        const sortedTransactions = accountTransactions.sort((a, b) => {
          const dateA = dayjs(a.date);
          const dateB = dayjs(b.date);
          return dateA.isBefore(dateB) ? -1 : dateA.isAfter(dateB) ? 1 : 0;
        });

        // Calculate running balance backwards from current balance
        let runningBalance = account.currentBalance;
        for (let i = sortedTransactions.length - 1; i >= 0; i--) {
          const transaction = sortedTransactions[i];
          // Store the running balance for this transaction
          sortedTransactions[i] = {
            ...transaction,
            runningBalance,
            accountName: account.name,
            categoryName: categories.find(c => c.categoryId === transaction.categoryId)?.name || ''
          };

          // Calculate previous balance based on transaction type
          if (transaction.type === 'expense') {
            runningBalance += Number(transaction.amount); // Add back the expense
          } else if (transaction.type === 'income') {
            runningBalance -= Number(transaction.amount); // Subtract the income
          } else if (transaction.type === 'transfer') {
            if (transaction.accountId === account.accountId) {
              runningBalance += Number(transaction.amount); // Add back outgoing transfer
            }
            if (transaction.toAccountId === account.accountId) {
              runningBalance -= Number(transaction.amount); // Subtract incoming transfer
            }
          }
        }

        allTransactions = [...allTransactions, ...sortedTransactions];
      }

      // Filter transactions based on export filters
      const filteredTransactions = allTransactions.filter(t => {
        const transactionDate = dayjs(t.date);
        const isInDateRange = transactionDate.isBetween(
          exportFilters.startDate, 
          exportFilters.endDate, 
          'day', 
          '[]'
        );

        const isSelectedAccount = exportFilters.accounts.length === 0 || 
          exportFilters.accounts.includes(t.accountId) ||
          exportFilters.accounts.includes(t.toAccountId);

        const isSelectedCategory = exportFilters.categories.length === 0 || 
          exportFilters.categories.includes(t.categoryId);

        const isSelectedType = exportFilters.transactionTypes.includes(t.type);

        return isInDateRange && isSelectedAccount && isSelectedCategory && isSelectedType;
      });

      // Sort filtered transactions by date
      return filteredTransactions.sort((a, b) => {
        const dateA = dayjs(a.date);
        const dateB = dayjs(b.date);
        return dateA.isBefore(dateB) ? -1 : dateA.isAfter(dateB) ? 1 : 0;
      });

    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  };

  // Update the handleExport function
  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      let exportData;
      
      switch (activeTab) {
        case 0:
          exportData = reportData.expensesByCategory;
          break;
        case 1:
          exportData = reportData.incomeByCategory;
          break;
        case 2:
          exportData = reportData.cashFlow;
          break;
        case 3:
          exportData = reportData.accountBalances;
          break;
        default:
          throw new Error('Invalid report type');
      }

      if (customReport.enabled) {
        await ReportExport.exportCustomReport(exportData, {
          format: exportFormat,
          reportType: getReportTitle(),
          currency,
          dateRange: { startDate: exportFilters.startDate, endDate: exportFilters.endDate },
          paperSize: customReport.paperSize,
          orientation: customReport.orientation,
          includeCharts: customReport.includeCharts,
          customHeaders: customReport.headers,
          customSummary: customReport.includeSummary,
          filters: customReport.filters,
          charts: getChartData()
        });
      } else {
        await ReportExport.exportReport(
          exportData,
          exportFormat,
          getReportTitle(),
          currency,
          { startDate: exportFilters.startDate, endDate: exportFilters.endDate }
        );
      }
      
      setSuccess('Report exported successfully');
      setExportDialog(false); // Close the dialog after successful export
      setTimeout(() => setSuccess(null), 3000); // Clear success message after 3 seconds
    } catch (error) {
      setError('Failed to export report: ' + error.message);
    } finally {
      setLoading(false);
      setExportFormat('');
    }
  };

  // Update CSV formatting
  const formatTransactionsToCSV = (transactions) => {
    const headers = [
      'Date',
      'Type',
      'Account',
      'Category',
      'Description',
      'Amount',
      'Running Balance',
      'Payment Method',
      'Location',
      'Notes'
    ].join(',');

    const rows = transactions.map(t => [
      dayjs(t.date).format('YYYY-MM-DD'),
      t.type,
      t.accountName,
      t.categoryName,
      `"${t.description || ''}"`,
      formatCurrency(t.amount), // Format amount with proper currency
      formatCurrency(t.runningBalance), // Format balance with proper currency
      t.paymentMethod || '',
      `"${t.location || ''}"`,
      `"${t.notes || ''}"`
    ].join(','));

    return [headers, ...rows].join('\n');
  };

  // Add the downloadFile function if not already present
  const downloadFile = (data, format) => {
    const blob = new Blob([data], { 
      type: format === 'csv' 
        ? 'text/csv;charset=utf-8;' 
        : 'application/json;charset=utf-8;' 
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${dayjs().format('YYYY-MM-DD')}.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateCustomReport = () => {
    // TODO: Save custom report configuration
    setCustomReportDialog(false);
  };

  const handleSelectAllAccounts = (event) => {
    if (event.target.checked) {
      setExportFilters(prev => ({
        ...prev,
        accounts: availableAccounts.map(acc => acc.accountId)
      }));
    } else {
      setExportFilters(prev => ({
        ...prev,
        accounts: []
      }));
    }
  };

  const handleSelectAllCategories = (event) => {
    if (event.target.checked) {
      setExportFilters(prev => ({
        ...prev,
        categories: availableCategories.map(cat => cat.categoryId)
      }));
    } else {
      setExportFilters(prev => ({
        ...prev,
        categories: []
      }));
    }
  };

  // Update PDF generation
  const generatePDF = async (transactions) => {
    try {
      if (!Array.isArray(transactions)) {
        console.error('Invalid transactions data:', transactions);
        throw new Error('Invalid transactions data');
      }

      const doc = new jsPDF({
        orientation: exportOptions.orientation,
        unit: 'mm',
        format: exportOptions.paperSize
      });

      // Add title and header information
      doc.setFontSize(16);
      doc.text('Transaction Report', 14, 15);
      doc.setFontSize(12);
      doc.text(`Generated on ${dayjs().format('MMMM D, YYYY')}`, 14, 25);
      doc.text(`Date Range: ${dayjs(exportFilters.startDate).format('MMM D, YYYY')} - ${dayjs(exportFilters.endDate).format('MMM D, YYYY')}`, 14, 32);

      // Add filters information
      let yPos = 39;
      if (exportFilters.accounts.length > 0) {
        const accountNames = availableAccounts
          .filter(acc => exportFilters.accounts.includes(acc.accountId))
          .map(acc => acc.name)
          .join(', ');
        doc.text(`Accounts: ${accountNames}`, 14, yPos);
        yPos += 7;
      }

      if (exportFilters.categories.length > 0) {
        const categoryNames = availableCategories
          .filter(cat => exportFilters.categories.includes(cat.categoryId))
          .map(cat => cat.name)
          .join(', ');
        doc.text(`Categories: ${categoryNames}`, 14, yPos);
        yPos += 7;
      }

      // Add transactions table with running balance
      const tableData = transactions.map(t => [
        dayjs(t.date).format('YYYY-MM-DD'),
        t.type.charAt(0).toUpperCase() + t.type.slice(1),
        t.accountName || '',
        t.categoryName || '',
        t.description || '',
        formatCurrency(t.amount),
        formatCurrency(t.runningBalance),
        t.paymentMethod || '',
        t.location || ''
      ]);

      doc.autoTable({
        startY: yPos + 5,
        head: [['Date', 'Type', 'Account', 'Category', 'Description', 'Amount', 'Balance', 'Payment Method', 'Location']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: {
          5: { halign: 'right' },
          6: { halign: 'right' }
        }
      });

      return doc;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

  // Update the calculateDailyTrends function
  const calculateDailyTrends = (transactions) => {
    if (!Array.isArray(transactions)) {
      return generateMonthlyLabels().map(date => ({
        date,
        income: 0,
        expenses: 0
      }));
    }

    const monthlyMap = new Map();
    
    // Initialize all months with zero values
    generateMonthlyLabels().forEach(monthDate => {
      monthlyMap.set(monthDate, {
        date: monthDate,
        income: 0,
        expenses: 0
      });
    });

    // Group transactions by month
    transactions.forEach(t => {
      if (!t || !t.date || !t.type) return; // Skip invalid transactions
      
      const monthDate = dayjs(t.date).startOf('month').format('YYYY-MM-DD');
      const current = monthlyMap.get(monthDate);
      
      if (!current) return; // Skip if month not found in map
      
      if (t.type === 'income') {
        current.income += Number(t.amount) || 0;
      } else if (t.type === 'expense') {
        current.expenses += Math.abs(Number(t.amount)) || 0;
      }
    });

    return Array.from(monthlyMap.values())
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  };

  // Update the calculateCashFlow function similarly
  const calculateCashFlow = (transactions) => {
    if (!Array.isArray(transactions)) {
      return generateMonthlyLabels().map(date => ({
        date,
        income: 0,
        expenses: 0,
        netFlow: 0
      }));
    }

    const monthlyMap = new Map();
    
    // Initialize all months with zero values
    generateMonthlyLabels().forEach(monthDate => {
      monthlyMap.set(monthDate, {
        date: monthDate,
        income: 0,
        expenses: 0,
        netFlow: 0
      });
    });

    // Group transactions by month
    transactions.forEach(t => {
      if (!t || !t.date || !t.type) return; // Skip invalid transactions
      
      const monthDate = dayjs(t.date).startOf('month').format('YYYY-MM-DD');
      const current = monthlyMap.get(monthDate);
      
      if (!current) return; // Skip if month not found in map
      
      if (t.type === 'income') {
        current.income += Number(t.amount) || 0;
      } else if (t.type === 'expense') {
        current.expenses += Math.abs(Number(t.amount)) || 0;
      }
      
      current.netFlow = current.income - current.expenses;
    });

    return Array.from(monthlyMap.values())
      .sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
  };

  // Update the renderExpensesChart function
  const renderExpensesChart = () => {
    return (
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', boxShadow: theme.shadows[4] }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Expenses by Category
                </Typography>
                <Box sx={{ height: 300, mt: 2 }}>
                  <ResponsiveContainer>
                    <PieChart {...chartStyles.pieChart}>
                      <Pie
                        data={reportData.expensesByCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                      >
                        {reportData.expensesByCategory.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            stroke={theme.palette.background.paper}
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        content={<CustomTooltip />}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Legend 
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => (
                          <span style={{ color: theme.palette.text.primary }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', boxShadow: theme.shadows[4] }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly Expense Trend
                </Typography>
                <Box sx={{ height: 300, mt: 2 }}>
                  <ResponsiveContainer>
                    <BarChart data={reportData.dailyTrends} barGap={0} barCategoryGap={0}>
                      <defs>
                        <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF6B6B" stopOpacity={0.9}/>
                          <stop offset="50%" stopColor="#FF8787" stopOpacity={0.7}/>
                          <stop offset="100%" stopColor="#FFA5A5" stopOpacity={0.5}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={theme.palette.divider}
                        opacity={0.3}
                        vertical={false}
                      />
                      <XAxis 
                        dataKey="date" 
                        stroke={theme.palette.text.secondary}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        tickFormatter={(value) => dayjs(value).format('MMM')}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke={theme.palette.text.secondary}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        tickFormatter={(value) => `₹${value}`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip 
                        content={<CustomTooltip />}
                        cursor={{ 
                          fill: 'rgba(0, 0, 0, 0.1)',
                          radius: [4, 4, 0, 0] 
                        }}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Expenses"
                        fill="url(#expenseGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={50}
                        minPointSize={5}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // Similarly update the renderIncomeChart function
  const renderIncomeChart = () => {
    return (
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', boxShadow: theme.shadows[4] }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Income by Source
                </Typography>
                <Box sx={{ height: 300, mt: 2 }}>
                  <ResponsiveContainer>
                    <PieChart {...chartStyles.pieChart}>
                      <Pie
                        data={reportData.incomeByCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                      >
                        {reportData.incomeByCategory.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            stroke={theme.palette.background.paper}
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        content={<CustomTooltip />}
                        cursor={{ fill: 'transparent' }}
                      />
                      <Legend 
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => (
                          <span style={{ color: theme.palette.text.primary }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%', boxShadow: theme.shadows[4] }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly Income Trend
                </Typography>
                <Box sx={{ height: 300, mt: 2 }}>
                  <ResponsiveContainer>
                    <BarChart data={reportData.dailyTrends} barGap={0} barCategoryGap={0}>
                      <defs>
                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4CAF50" stopOpacity={0.9}/>
                          <stop offset="50%" stopColor="#66BB6A" stopOpacity={0.7}/>
                          <stop offset="100%" stopColor="#81C784" stopOpacity={0.5}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={theme.palette.divider}
                        opacity={0.3}
                        vertical={false}
                      />
                      <XAxis 
                        dataKey="date" 
                        stroke={theme.palette.text.secondary}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        tickFormatter={(value) => dayjs(value).format('MMM')}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke={theme.palette.text.secondary}
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        tickFormatter={(value) => `₹${value}`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip 
                        content={<CustomTooltip />}
                        cursor={{ 
                          fill: 'rgba(0, 0, 0, 0.1)',
                          radius: [4, 4, 0, 0] 
                        }}
                      />
                      <Bar
                        dataKey="income"
                        name="Income"
                        fill="url(#incomeGradient)"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={50}
                        minPointSize={5}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderCashFlowChart = () => {
    return (
      <Box sx={{ mt: 3 }}>
        <Card sx={{ height: '100%', boxShadow: theme.shadows[4] }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cash Flow Analysis
            </Typography>
            <Box sx={{ height: 400, mt: 2 }}>
              <ResponsiveContainer>
                <ComposedChart data={reportData.cashFlow} barGap={0} barCategoryGap={0}>
                  <defs>
                    <linearGradient id="cashFlowIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4CAF50" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#81C784" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="cashFlowExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF6B6B" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#FFA5A5" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="netFlowGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2196F3" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#64B5F6" stopOpacity={0.6}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={theme.palette.divider}
                    opacity={0.3}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="date" 
                    stroke={theme.palette.text.secondary}
                    tick={{ fill: theme.palette.text.secondary }}
                    tickFormatter={(value) => dayjs(value).format('MMM')}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke={theme.palette.text.secondary}
                    tick={{ fill: theme.palette.text.secondary }}
                    tickFormatter={(value) => `₹${value}`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip 
                    content={<CustomTooltip />}
                    cursor={{ fill: theme.palette.action.hover }}
                  />
                  <Bar 
                    dataKey="income" 
                    fill="url(#cashFlowIncomeGradient)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={50}
                    minPointSize={5}
                    stackId="a"
                    name="Income"
                  />
                  <Bar 
                    dataKey="expenses" 
                    fill="url(#cashFlowExpenseGradient)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={50}
                    minPointSize={5}
                    stackId="a"
                    name="Expenses"
                  />
                  <Line
                    type="monotone"
                    dataKey="netFlow"
                    stroke="url(#netFlowGradient)"
                    strokeWidth={3}
                    dot={false}
                    name="Net Flow"
                  />
                  <Legend 
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span style={{ color: theme.palette.text.primary }}>{value}</span>
                    )}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  const renderAccountDistribution = () => {
    // Filter out accounts with zero or negative balance and sort by balance
    const accountData = reportData.accountBalances
      .filter(account => account.balance > 0)
      .map((account, index) => ({
        name: account.name,
        value: account.balance,
        // Use COLORS array instead of account.colorCode if it's black or yellow
        color: account.colorCode === '#000000' || account.colorCode === '#FFD700' 
          ? COLORS[index % COLORS.length] 
          : account.colorCode
      }))
      .sort((a, b) => b.value - a.value);

    const total = accountData.reduce((sum, account) => sum + account.value, 0);

    return (
      <Box sx={{ mt: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Account Balance Distribution
            </Typography>
            {accountData.length > 0 ? (
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={accountData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      label={({name, value}) => `${name} (${((value/total) * 100).toFixed(1)}%)`}
                    >
                      {accountData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke={theme.palette.background.paper}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: '8px',
                        boxShadow: theme.shadows[3]
                      }}
                    />
                    <Legend
                      formatter={(value, entry) => {
                        const { payload } = entry;
                        return `${value} (${formatCurrency(payload.value)})`;
                      }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  No accounts with positive balance found
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  };

  // Add this function near the top of the component
  const getReportTitle = () => {
    switch (activeTab) {
      case 0:
        return 'Expense Analysis';
      case 1:
        return 'Income Analysis';
      case 2:
        return 'Cash Flow';
      case 3:
        return 'Account Distribution';
      default:
        return 'Financial Report';
    }
  };

  // Update the export dialog with more customization options
  const renderExportDialog = () => (
    <Dialog 
      open={exportDialog} 
      onClose={() => setExportDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h6">Export {getReportTitle()}</Typography>
      </DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={3}>
            {/* Basic Export Settings */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Export Settings
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Export Format</InputLabel>
                <Select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                >
                  <MenuItem value={ReportExport.FORMATS.PDF}>PDF Document</MenuItem>
                  <MenuItem value={ReportExport.FORMATS.EXCEL}>Excel Spreadsheet</MenuItem>
                  <MenuItem value={ReportExport.FORMATS.CSV}>CSV File</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {exportFormat === ReportExport.FORMATS.PDF && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Paper Size</InputLabel>
                    <Select
                      value={customReport.paperSize}
                      onChange={(e) => setCustomReport(prev => ({ ...prev, paperSize: e.target.value }))}
                    >
                      <MenuItem value="A4">A4</MenuItem>
                      <MenuItem value="LETTER">Letter</MenuItem>
                      <MenuItem value="LEGAL">Legal</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Orientation</InputLabel>
                    <Select
                      value={customReport.orientation}
                      onChange={(e) => setCustomReport(prev => ({ ...prev, orientation: e.target.value }))}
                    >
                      <MenuItem value="PORTRAIT">Portrait</MenuItem>
                      <MenuItem value="LANDSCAPE">Landscape</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            {/* Date Range Selection */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Date Range
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="Start Date"
                value={exportFilters.startDate}
                onChange={(newDate) => setExportFilters(prev => ({ ...prev, startDate: newDate }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="End Date"
                value={exportFilters.endDate}
                onChange={(newDate) => setExportFilters(prev => ({ ...prev, endDate: newDate }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            {/* Additional Options */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Additional Options
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={customReport.includeCharts}
                    onChange={(e) => setCustomReport(prev => ({ 
                      ...prev, 
                      includeCharts: e.target.checked 
                    }))}
                  />
                }
                label="Include Charts"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={customReport.includeSummary}
                    onChange={(e) => setCustomReport(prev => ({ 
                      ...prev, 
                      includeSummary: e.target.checked 
                    }))}
                  />
                }
                label="Include Summary"
              />
            </Grid>

            {/* Custom Headers */}
            {customReport.enabled && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Custom Headers
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {customReport.headers.map((header, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField
                        label="Header Label"
                        value={header.label}
                        onChange={(e) => {
                          const newHeaders = [...customReport.headers];
                          newHeaders[index].label = e.target.value;
                          setCustomReport(prev => ({ ...prev, headers: newHeaders }));
                        }}
                        fullWidth
                      />
                      <IconButton 
                        onClick={() => {
                          const newHeaders = customReport.headers.filter((_, i) => i !== index);
                          setCustomReport(prev => ({ ...prev, headers: newHeaders }));
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setCustomReport(prev => ({
                        ...prev,
                        headers: [...prev.headers, { label: '', key: '', type: 'text' }]
                      }));
                    }}
                  >
                    Add Header
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <FormControlLabel
          control={
            <Switch
              checked={customReport.enabled}
              onChange={(e) => setCustomReport(prev => ({ ...prev, enabled: e.target.checked }))}
            />
          }
          label="Advanced Options"
        />
        <Button onClick={() => setExportDialog(false)}>Cancel</Button>
        <Button 
          onClick={handleExport} 
          variant="contained"
          disabled={!exportFormat}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderCustomReportDialog = () => (
    <Dialog open={customReportDialog} onClose={() => setCustomReportDialog(false)}>
      <DialogTitle>Create Custom Report</DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <TextField
            fullWidth
            margin="normal"
            label="Report Name"
            value={customReport.name}
            onChange={(e) => setCustomReport({ ...customReport, name: e.target.value })}
          />

          <TextField
            fullWidth
            margin="normal"
            label="Description"
            multiline
            rows={2}
            value={customReport.description}
            onChange={(e) => setCustomReport({ ...customReport, description: e.target.value })}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Report Type</InputLabel>
            <Select
              value={customReport.type}
              onChange={(e) => setCustomReport({ ...customReport, type: e.target.value })}
            >
              {reportTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.text}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Group By</InputLabel>
            <Select
              value={customReport.groupBy}
              onChange={(e) => setCustomReport({ ...customReport, groupBy: e.target.value })}
            >
              <MenuItem value="category">Category</MenuItem>
              <MenuItem value="account">Account</MenuItem>
              <MenuItem value="date">Date</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={customReport.timeframe}
              onChange={(e) => setCustomReport({ ...customReport, timeframe: e.target.value })}
            >
              <MenuItem value="week">Weekly</MenuItem>
              <MenuItem value="month">Monthly</MenuItem>
              <MenuItem value="quarter">Quarterly</MenuItem>
              <MenuItem value="year">Yearly</MenuItem>
              <MenuItem value="custom">Custom Range</MenuItem>
            </Select>
          </FormControl>

          {customReport.timeframe === 'custom' && (
            <Box mt={2}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <DatePicker
                    label="Start Date"
                    value={customReport.customStartDate}
                    onChange={(date) => setCustomReport({ ...customReport, customStartDate: date })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <DatePicker
                    label="End Date"
                    value={customReport.customEndDate}
                    onChange={(date) => setCustomReport({ ...customReport, customEndDate: date })}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          <FormControlLabel
            control={
              <Checkbox
              checked={customReport.includeCharts}
              onChange={(e) => setCustomReport({ ...customReport, includeCharts: e.target.checked })}
            />
            }
            label="Include Charts"
            sx={checkboxStyles}
          />
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCustomReportDialog(false)}>Cancel</Button>
        <Button onClick={handleCreateCustomReport} variant="contained" color="primary">
          Create Report
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Common hover styles for buttons and interactive elements
  const buttonHoverStyles = {
    '&:hover': {
      cursor: 'pointer',
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4]
    },
    '&:active': {
      transform: 'translateY(0)',
      boxShadow: theme.shadows[2]
    }
  };

  const selectStyles = {
    '& .MuiSelect-select': {
      '&:hover': {
        cursor: 'pointer'
      }
    },
    '& .MuiMenuItem-root': {
      '&:hover': {
        cursor: 'pointer',
        bgcolor: 'background.subtle'
      }
    }
  };

  const tabStyles = {
    '& .MuiTab-root': {
      '&:hover': {
        cursor: 'pointer',
        color: 'primary.main',
        bgcolor: 'background.subtle'
      }
    }
  };

  const checkboxStyles = {
    '& .MuiCheckbox-root': {
      '&:hover': {
        cursor: 'pointer'
      }
    },
    '& .MuiFormControlLabel-label': {
      '&:hover': {
        cursor: 'pointer'
      }
    }
  };

  // Add these helper functions for chart data
  const calculateExpensesByCategory = (transactions, categories) => {
    const expenseMap = new Map();
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const category = categories.find(c => c.categoryId === t.categoryId);
        if (category) {
          const currentAmount = expenseMap.get(category.name) || 0;
          expenseMap.set(category.name, currentAmount + Math.abs(t.amount));
        }
      });

    return Array.from(expenseMap, ([name, value]) => ({ name, value }));
  };

  const calculateIncomeByCategory = (transactions, categories) => {
    const incomeMap = new Map();
    
    transactions
      .filter(t => t.type === 'income')
      .forEach(t => {
        const category = categories.find(c => c.categoryId === t.categoryId);
        if (category) {
          const currentAmount = incomeMap.get(category.name) || 0;
          incomeMap.set(category.name, currentAmount + t.amount);
        }
      });

    return Array.from(incomeMap, ([name, value]) => ({ name, value }));
  };

  const calculateAccountBalances = (accounts) => {
    return accounts.map(account => ({
      name: account.name,
      balance: account.currentBalance,
      colorCode: account.colorCode || account.color || '#000000'
    }));
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Financial Reports
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Timeframe</InputLabel>
              <Select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                sx={selectStyles}
              >
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
                <MenuItem value="year">This Year</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={8}>
            <Box display="flex" justifyContent="flex-end" gap={2}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setCustomReportDialog(true)}
                sx={buttonHoverStyles}
              >
                Custom Report
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3} sx={{ my: 3 }}>
        {/* Total Expenses Card */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total Expenses
              </Typography>
              <Typography variant="h4" sx={{ my: 2 }}>
                {formatCurrency(monthlyStats.totalExpenses.amount)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  icon={monthlyStats.totalExpenses.change >= 0 ? <TrendingUp /> : <TrendingDown />}
                  label={`${Math.abs(monthlyStats.totalExpenses.change).toFixed(1)}% from last month`}
                  size="small"
                  color={monthlyStats.totalExpenses.change >= 0 ? 'error' : 'success'}
                  sx={{ mr: 1 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Income Card */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Total Income
              </Typography>
              <Typography variant="h4" sx={{ my: 2 }}>
                {formatCurrency(monthlyStats.totalIncome.amount)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  icon={monthlyStats.totalIncome.change >= 0 ? <TrendingUp /> : <TrendingDown />}
                  label={`${Math.abs(monthlyStats.totalIncome.change).toFixed(1)}% from last month`}
                  size="small"
                  color={monthlyStats.totalIncome.change >= 0 ? 'success' : 'error'}
                  sx={{ mr: 1 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Net Income Card */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Net Income
              </Typography>
              <Typography variant="h4" sx={{ my: 2 }}>
                {formatCurrency(monthlyStats.netIncome.amount)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  icon={monthlyStats.netIncome.change >= 0 ? <TrendingUp /> : <TrendingDown />}
                  label={`${Math.abs(monthlyStats.netIncome.change).toFixed(1)}% from last month`}
                  size="small"
                  color={monthlyStats.netIncome.change >= 0 ? 'success' : 'error'}
                  sx={{ mr: 1 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Category Card */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Top Category
              </Typography>
              <Typography variant="h4" sx={{ my: 2 }}>
                {topCategory.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  label={`${Math.round(topCategory.percentage)}% of total expenses`}
                  size="small"
                  color="primary"
                  sx={{ mr: 1 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={tabStyles}
      >
        <Tab label="Expenses" />
        <Tab label="Income" />
        <Tab label="Cash Flow" />
        <Tab label="Account Distribution" />
      </Tabs>

      {activeTab === 0 && renderExpensesChart()}
      {activeTab === 1 && renderIncomeChart()}
      {activeTab === 2 && renderCashFlowChart()}
      {activeTab === 3 && renderAccountDistribution()}

      {renderCustomReportDialog()}
    </Container>
  );
};

export default Reports;