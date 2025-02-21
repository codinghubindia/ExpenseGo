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
  Alert
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
  AreaChart
} from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import DatabaseService from '../../services/DatabaseService';
import {
  FileDownload as ExportIcon,
  Add as AddIcon,
  ArrowUpward,
  ArrowDownward
} from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useApp } from '../../contexts/AppContext';
import { useRegion } from '../../contexts/RegionContext';

const Reports = () => {
  const theme = useTheme();
  const { currentBank, currentYear } = useApp();
  const { currency } = useRegion();
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
    cashFlow: [],
    accountBalances: [],
    dailyTrends: []
  });
  const [customReportDialog, setCustomReportDialog] = useState(false);
  const [exportDialog, setExportDialog] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    format: 'csv',
    includeCharts: true,
    dateRange: 'current',
    customStartDate: dayjs(),
    customEndDate: dayjs(),
    paperSize: 'a4',
    orientation: 'portrait'
  });
  const [customReport, setCustomReport] = useState({
    name: '',
    description: '',
    type: 'expenses',
    groupBy: 'category',
    timeframe: 'month',
    customStartDate: dayjs(),
    customEndDate: dayjs(),
    includeCharts: true
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
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A5A5', '#9B6B6B', '#E9D985', '#556270', '#6C5B7B'
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

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();

      let startDate, endDate;
      
      // Ensure we have valid dayjs objects for dates
      if (exportOptions.dateRange === 'custom' && 
          exportFilters.startDate && 
          exportFilters.endDate) {
        startDate = dayjs(exportFilters.startDate);
        endDate = dayjs(exportFilters.endDate);
      } else {
      switch (timeframe) {
        case 'week':
          startDate = dayjs().subtract(7, 'day');
          endDate = dayjs();
          break;
        case 'month':
          startDate = dayjs().startOf('month');
          endDate = dayjs().endOf('month');
          break;
        case 'year':
          startDate = dayjs().startOf('year');
          endDate = dayjs().endOf('year');
          break;
        default:
          startDate = dayjs().startOf('month');
          endDate = dayjs().endOf('month');
        }
      }

      // Ensure we have valid dates before proceeding
      if (!startDate.isValid() || !endDate.isValid()) {
        console.error('Invalid date range');
        setLoading(false);
        return;
      }

      // Get transactions for the period
      const transactions = await DatabaseService.getTransactions(bankId, year, {
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD')
      });

      // Get categories
      const categories = await DatabaseService.getCategories(bankId, year);

      // Calculate expenses by category
      const expensesByCategory = categories
        .filter(cat => cat.type === 'expense')
        .map(category => {
          const total = transactions
            .filter(t => t.categoryId === category.categoryId && t.type === 'expense')
            .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
          return {
            name: category.name,
            value: total,
            color: category.colorCode
          };
        })
        .filter(cat => cat.value > 0)
        .sort((a, b) => b.value - a.value);

      // Calculate income by category
      const incomeByCategory = categories
        .filter(cat => cat.type === 'income')
        .map(category => {
          const total = transactions
            .filter(t => t.categoryId === category.categoryId && t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0);
          return {
            name: category.name,
            value: total,
            color: category.colorCode
          };
        })
        .filter(cat => cat.value > 0)
        .sort((a, b) => b.value - a.value);

      // Calculate daily cash flow
      const cashFlow = [];
      let currentDate = startDate;
      while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        const dayTransactions = transactions.filter(t => 
          dayjs(t.date).format('YYYY-MM-DD') === currentDate.format('YYYY-MM-DD')
        );

        const income = dayTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const expense = dayTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

        cashFlow.push({
          date: currentDate.format('MMM DD'),
          income,
          expense,
          net: income - expense
        });

        currentDate = currentDate.add(1, 'day');
      }

      // Get account balances
      const accounts = await DatabaseService.getAccounts(bankId, year);
      const accountBalances = accounts.map(account => ({
        name: account.name,
        value: Number(account.currentBalance),
        color: COLORS[accounts.indexOf(account) % COLORS.length]
      }));

      // Calculate summary data
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const netIncome = totalIncome - totalExpenses;

      // Find top expense category
      const expenseCategories = {};
      transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
          expenseCategories[t.categoryId] = (expenseCategories[t.categoryId] || 0) + Math.abs(Number(t.amount));
        });

      const topExpenseCategoryId = Object.entries(expenseCategories)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

      const topExpenseCategory = categories.find(c => c.categoryId === topExpenseCategoryId)?.name || '';

      // Ensure all numeric values are properly converted
      const formattedData = {
        summary: {
          totalIncome,
          totalExpenses,
          netIncome,
          topExpenseCategory,
          topIncomeSource: '', // Calculate this if needed
          monthlyGrowth: 0 // Calculate this if needed
        },
        expensesByCategory: expensesByCategory.map(item => ({
          ...item,
          value: Number(item.value) || 0
        })),
        incomeByCategory: incomeByCategory.map(item => ({
          ...item,
          value: Number(item.value) || 0
        })),
        cashFlow: cashFlow.map(item => ({
          ...item,
          income: Number(item.income) || 0,
          expense: Number(item.expense) || 0,
          net: Number(item.net) || 0
        })),
        accountBalances: accountBalances.map(item => ({
          ...item,
          value: Number(item.value) || 0
        })),
        dailyTrends: transactions.map(t => ({
          date: dayjs(t.date).format('MMM DD'),
          transactions: 1
        }))
      };

      setReportData(formattedData);
    } catch (error) {
      console.error('Error loading report data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [timeframe, exportOptions, exportFilters]);

  // Load accounts and categories for filters
  const loadFilterData = useCallback(async () => {
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      
      const [accounts, categories] = await Promise.all([
        DatabaseService.getAccounts(bankId, year),
        DatabaseService.getCategories(bankId, year)
      ]);

      setAvailableAccounts(accounts);
      setAvailableCategories(categories);
    } catch (error) {
      console.error('Error loading filter data:', error);
    }
  }, [currentBank, currentYear]);

  // Memoize loadData functions
  const loadData = useCallback(async () => {
    try {
      await loadReportData();
      await loadFilterData();
    } catch (err) {
      setError(err.message);
    }
  }, [currentBank, currentYear, loadReportData, loadFilterData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Update CustomTooltip component to handle currency properly
  const CustomTooltip = useCallback(({ active, payload, label }) => {
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
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: entry.color
                }}
              />
              <Typography variant="body2">
                {`${entry.name}: ${formatCurrency(entry.value)}`}
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
      const transactions = await fetchTransactionsForExport();
      
      if (!transactions || transactions.length === 0) {
        // TODO: Show a notification that no transactions were found
        console.warn('No transactions found for the selected filters');
        return;
      }

      let data;
      if (exportOptions.format === 'pdf') {
        const doc = await generatePDF(transactions);
        doc.save(`financial_report_${dayjs().format('YYYY-MM-DD')}.pdf`);
      } else if (exportOptions.format === 'csv') {
        data = formatTransactionsToCSV(transactions);
        downloadFile(data, 'csv');
      } else {
        data = JSON.stringify(transactions, null, 2);
        downloadFile(data, 'json');
      }
      setExportDialog(false);
    } catch (error) {
      console.error('Error exporting report:', error);
      // TODO: Show error notification
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

  // Update the renderExpensesChart function
  const renderExpensesChart = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="overline">
                    Total Expenses
                  </Typography>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    {formatCurrency(reportData.summary?.totalExpenses || 0)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ArrowUpward color="error" fontSize="small" />
                    <Typography variant="body2" color="error.main">
                      +12% from last month
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="overline">
                    Total Income
                  </Typography>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    {formatCurrency(reportData.summary.totalIncome)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ArrowUpward color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main">
                      +8% from last month
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="overline">
                    Net Income
                  </Typography>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    {formatCurrency(reportData.summary.netIncome)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ArrowDownward color="error" fontSize="small" />
                    <Typography variant="body2" color="error.main">
                      -4% from last month
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="overline">
                    Top Category
                  </Typography>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    {reportData.summary.topExpenseCategory}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    32% of total expenses
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Trend
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportData.cashFlow}>
                    <defs>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="date" 
                      stroke={theme.palette.text.secondary}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke={theme.palette.text.secondary}
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <RechartsTooltip content={CustomTooltip} />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      stroke={theme.palette.error.main}
                      fill="url(#colorExpense)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Category Distribution
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
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
                    <RechartsTooltip content={CustomTooltip} />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ mt: 2 }}>
                  {reportData.expensesByCategory.slice(0, 4).map((category, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: COLORS[index % COLORS.length]
                          }}
                        />
                        <Typography variant="body2">
                          {category.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(category.value)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Update the renderIncomeChart function
  const renderIncomeChart = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="overline">
                    Total Income
                  </Typography>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    {formatCurrency(reportData.summary?.totalIncome || 0)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ArrowUpward color="success" fontSize="small" />
                    <Typography variant="body2" color="success.main">
                      +8% from last month
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="overline">
                    Average Income
                  </Typography>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    {formatCurrency((reportData.summary?.totalIncome || 0) / 12)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Per month
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="overline">
                    Top Source
                  </Typography>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    {reportData.summary.topIncomeSource || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    28% of total income
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="overline">
                    Income Growth
                  </Typography>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    +12%
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    Year over year
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Income Trend
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportData.cashFlow}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis 
                      dataKey="date" 
                      stroke={theme.palette.text.secondary}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke={theme.palette.text.secondary}
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <RechartsTooltip content={CustomTooltip} />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke={theme.palette.success.main}
                      fill="url(#colorIncome)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Income Sources
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.incomeByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
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
                    <RechartsTooltip content={CustomTooltip} />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ mt: 2 }}>
                  {reportData.incomeByCategory.slice(0, 4).map((category, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 1
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: COLORS[index % COLORS.length]
                          }}
                        />
                        <Typography variant="body2">
                          {category.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(category.value)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderCashFlowChart = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="overline">
                    Net Cash Flow
                  </Typography>
                  <Typography variant="h4" sx={{ mb: 2 }}>
                    {formatCurrency(reportData.summary?.netIncome || 0)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {reportData.summary?.netIncome > 0 ? (
                      <>
                        <ArrowUpward color="success" fontSize="small" />
                        <Typography variant="body2" color="success.main">
                          Positive cash flow
                        </Typography>
                      </>
                    ) : (
                      <>
                        <ArrowDownward color="error" fontSize="small" />
                        <Typography variant="body2" color="error.main">
                          Negative cash flow
                        </Typography>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Add more summary cards for cash flow */}
          </Grid>
        </Grid>

        {/* Cash Flow Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cash Flow Analysis
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportData.cashFlow}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="date" stroke={theme.palette.text.secondary} />
                    <YAxis stroke={theme.palette.text.secondary} tickFormatter={(value) => formatCurrency(value)} />
                    <RechartsTooltip content={CustomTooltip} />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke={theme.palette.success.main}
                      fill="url(#colorIncome)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      name="Expenses"
                      stroke={theme.palette.error.main}
                      fill="url(#colorExpenses)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderAccountDistribution = () => (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Account Balance Distribution
      </Typography>
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={reportData.accountBalances}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={150}
            label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
          >
            {reportData.accountBalances.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );

  const renderExportDialog = () => (
    <Dialog 
      open={exportDialog} 
      onClose={() => setExportDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Export Transactions</DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Format</InputLabel>
                <Select
                  value={exportOptions.format}
                  onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value })}
                >
                  <MenuItem value="csv">CSV</MenuItem>
                  <MenuItem value="json">JSON</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {exportOptions.format === 'pdf' && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Paper Size</InputLabel>
                    <Select
                      value={exportOptions.paperSize}
                      onChange={(e) => setExportOptions({ ...exportOptions, paperSize: e.target.value })}
                    >
                      <MenuItem value="a4">A4</MenuItem>
                      <MenuItem value="letter">Letter</MenuItem>
                      <MenuItem value="legal">Legal</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Orientation</InputLabel>
                    <Select
                      value={exportOptions.orientation}
                      onChange={(e) => setExportOptions({ ...exportOptions, orientation: e.target.value })}
                    >
                      <MenuItem value="portrait">Portrait</MenuItem>
                      <MenuItem value="landscape">Landscape</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={exportOptions.dateRange}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setExportOptions(prev => ({ ...prev, dateRange: newValue }));
                    
                    // Update export filters based on selected date range
                    if (newValue !== 'custom') {
                      let startDate, endDate;
                      switch (newValue) {
                        case 'week':
                          startDate = dayjs().subtract(7, 'day');
                          endDate = dayjs();
                          break;
                        case 'month':
                          startDate = dayjs().startOf('month');
                          endDate = dayjs().endOf('month');
                          break;
                        case 'year':
                          startDate = dayjs().startOf('year');
                          endDate = dayjs().endOf('year');
                          break;
                        default:
                          startDate = dayjs().startOf('month');
                          endDate = dayjs().endOf('month');
                      }
                      setExportFilters(prev => ({
                        ...prev,
                        startDate,
                        endDate
                      }));
                    }
                  }}
                >
                  <MenuItem value="current">Current Period</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                  <MenuItem value="all">All Time</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {exportOptions.dateRange === 'custom' && (
              <>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Start Date"
                    value={exportFilters.startDate}
                    onChange={(newDate) => {
                      if (newDate && newDate.isValid()) {
                        setExportFilters(prev => ({
                          ...prev,
                          startDate: newDate
                        }));
                      }
                    }}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true, 
                        margin: 'normal',
                        error: !exportFilters.startDate?.isValid()
                      } 
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="End Date"
                    value={exportFilters.endDate}
                    onChange={(newDate) => {
                      if (newDate && newDate.isValid()) {
                        setExportFilters(prev => ({
                          ...prev,
                          endDate: newDate
                        }));
                      }
                    }}
                    slotProps={{ 
                      textField: { 
                        fullWidth: true, 
                        margin: 'normal',
                        error: !exportFilters.endDate?.isValid()
                      } 
                    }}
                    minDate={exportFilters.startDate}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Accounts</InputLabel>
                <Select
                  multiple
                  value={exportFilters.accounts}
                  onChange={(e) => setExportFilters({ ...exportFilters, accounts: e.target.value })}
                  renderValue={(selected) => {
                    if (selected.length === availableAccounts.length) return 'All Accounts';
                    const selectedAccounts = availableAccounts
                      .filter(acc => selected.includes(acc.accountId))
                      .map(acc => acc.name)
                      .join(', ');
                    return selectedAccounts || 'No Accounts Selected';
                  }}
                >
                  <MenuItem>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportFilters.accounts.length === availableAccounts.length}
                          indeterminate={
                            exportFilters.accounts.length > 0 &&
                            exportFilters.accounts.length < availableAccounts.length
                          }
                          onChange={handleSelectAllAccounts}
                        />
                      }
                      label="Select All"
                    />
                  </MenuItem>
                  <Divider />
                  {availableAccounts.map((account) => (
                    <MenuItem key={account.accountId} value={account.accountId}>
                      <Checkbox checked={exportFilters.accounts.includes(account.accountId)} />
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Categories</InputLabel>
                <Select
                  multiple
                  value={exportFilters.categories}
                  onChange={(e) => setExportFilters({ ...exportFilters, categories: e.target.value })}
                  renderValue={(selected) => {
                    if (selected.length === availableCategories.length) return 'All Categories';
                    const selectedCategories = availableCategories
                      .filter(cat => selected.includes(cat.categoryId))
                      .map(cat => cat.name)
                      .join(', ');
                    return selectedCategories || 'No Categories Selected';
                  }}
                >
                  <MenuItem>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportFilters.categories.length === availableCategories.length}
                          indeterminate={
                            exportFilters.categories.length > 0 &&
                            exportFilters.categories.length < availableCategories.length
                          }
                          onChange={handleSelectAllCategories}
                        />
                      }
                      label="Select All"
                    />
                  </MenuItem>
                  <Divider />
                  {availableCategories.map((category) => (
                    <MenuItem key={category.categoryId} value={category.categoryId}>
                      <Checkbox checked={exportFilters.categories.includes(category.categoryId)} />
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Transaction Types</InputLabel>
                <Select
                  multiple
                  value={exportFilters.transactionTypes}
                  onChange={(e) => setExportFilters({ ...exportFilters, transactionTypes: e.target.value })}
                >
                  <MenuItem value="expense">
                    <Checkbox checked={exportFilters.transactionTypes.includes('expense')} />
                    Expenses
                  </MenuItem>
                  <MenuItem value="income">
                    <Checkbox checked={exportFilters.transactionTypes.includes('income')} />
                    Income
                  </MenuItem>
                  <MenuItem value="transfer">
                    <Checkbox checked={exportFilters.transactionTypes.includes('transfer')} />
                    Transfers
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={() => setExportDialog(false)}
          sx={buttonHoverStyles}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleExport} 
          variant="contained" 
          color="primary"
          sx={buttonHoverStyles}
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
              <Button
                variant="contained"
                startIcon={<ExportIcon />}
                onClick={() => setExportDialog(true)}
                sx={buttonHoverStyles}
              >
                Export
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={tabStyles}
      >
        <Tab label="Expenses" sx={{ cursor: 'pointer' }} />
        <Tab label="Income" sx={{ cursor: 'pointer' }} />
        <Tab label="Cash Flow" sx={{ cursor: 'pointer' }} />
        <Tab label="Account Distribution" sx={{ cursor: 'pointer' }} />
      </Tabs>

      {activeTab === 0 && renderExpensesChart()}
      {activeTab === 1 && renderIncomeChart()}
      {activeTab === 2 && renderCashFlowChart()}
      {activeTab === 3 && renderAccountDistribution()}

      {renderExportDialog()}
      {renderCustomReportDialog()}
    </Container>
  );
};



export default Reports;