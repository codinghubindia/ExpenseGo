import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Chip,
  Tooltip
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import dayjs from 'dayjs';

const TransactionList = ({ 
  transactions, 
  accounts,
  onEdit, 
  onDelete,
  formatCurrency 
}) => {
  // Calculate running balances for each account
  const transactionsWithBalance = useMemo(() => {
    // Group transactions by account
    const accountTransactions = {};
    accounts.forEach(account => {
      accountTransactions[account.accountId] = {
        currentBalance: account.currentBalance,
        transactions: []
      };
    });

    // Sort all transactions by date in descending order
    const sortedTransactions = [...transactions].sort((a, b) => {
      return dayjs(b.date).valueOf() - dayjs(a.date).valueOf();
    });

    // Calculate running balances for each transaction
    const processedTransactions = sortedTransactions.map(transaction => {
      const accountId = transaction.accountId;
      const account = accountTransactions[accountId];
      
      if (!account) return transaction;

      let runningBalance = account.currentBalance;
      
      // Adjust running balance based on previous transactions
      account.transactions.forEach(t => {
        if (t.type === 'expense') {
          runningBalance += Number(t.amount);
        } else if (t.type === 'income') {
          runningBalance -= Number(t.amount);
        } else if (t.type === 'transfer') {
          if (t.accountId === accountId) {
            runningBalance += Number(t.amount);
          }
          if (t.toAccountId === accountId) {
            runningBalance -= Number(t.amount);
          }
        }
      });

      // Store the running balance for this transaction
      const transactionWithBalance = {
        ...transaction,
        runningBalance
      };

      // Update account's transaction list
      account.transactions.push(transaction);

      return transactionWithBalance;
    });

    return processedTransactions;
  }, [transactions, accounts]);

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Account</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>Description</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell align="right">Balance</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactionsWithBalance.length > 0 ? (
            transactionsWithBalance.map((transaction) => (
              <TableRow key={transaction.transactionId}>
                <TableCell>{dayjs(transaction.date).format('YYYY-MM-DD')}</TableCell>
                <TableCell>
                  <Chip
                    label={transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                    color={
                      transaction.type === 'income' ? 'success' :
                      transaction.type === 'expense' ? 'error' : 'info'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {transaction.accountName}
                  {transaction.type === 'transfer' && transaction.toAccountName && (
                    <Tooltip title="Transfer">
                      <Typography variant="caption" component="div">
                        → {transaction.toAccountName}
                      </Typography>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>{transaction.categoryName}</TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell align="right">
                  <Typography
                    color={
                      transaction.type === 'income' ? 'success.main' :
                      transaction.type === 'expense' ? 'error.main' : 'info.main'
                    }
                  >
                    {formatCurrency(transaction.amount, transaction.accountCurrency)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(transaction.runningBalance, transaction.accountCurrency)}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => onEdit(transaction)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete(transaction)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} align="center">
                <Typography color="textSecondary">
                  No transactions found
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TransactionList; 