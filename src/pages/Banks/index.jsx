import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import DatabaseService from '../../services/DatabaseService';

const Banks = () => {
  const [banks, setBanks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '🏦'
  });

  useEffect(() => {
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      const data = await DatabaseService.getBanks();
      setBanks(data);
    } catch (error) {
      console.error('Error loading banks:', error);
      // TODO: Show error notification
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedBank) {
        await DatabaseService.updateBank(selectedBank.bankId, formData);
      } else {
        await DatabaseService.createBank(formData);
      }
      await loadBanks();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving bank:', error);
      // TODO: Show error notification
    }
  };

  const handleDelete = async (bankId) => {
    if (window.confirm('Are you sure you want to delete this bank? This will delete all associated accounts and transactions.')) {
      try {
        await DatabaseService.deleteBank(bankId);
        await loadBanks();
      } catch (error) {
        console.error('Error deleting bank:', error);
        // TODO: Show error notification
      }
    }
  };

  const handleOpenDialog = (bank = null) => {
    if (bank) {
      setSelectedBank(bank);
      setFormData({
        name: bank.name,
        icon: bank.icon
      });
    } else {
      setSelectedBank(null);
      setFormData({
        name: '',
        icon: '🏦'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedBank(null);
    setFormData({
      name: '',
      icon: '🏦'
    });
  };

  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Banks</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Bank
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Icon</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {banks.map((bank) => (
              <TableRow key={bank.bankId}>
                <TableCell>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {bank.icon}
                  </Avatar>
                </TableCell>
                <TableCell>{bank.name}</TableCell>
                <TableCell>
                  {new Date(bank.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenDialog(bank)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleDelete(bank.bankId)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {selectedBank ? 'Edit Bank' : 'New Bank'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Bank Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              margin="dense"
              label="Icon"
              fullWidth
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              helperText="You can use an emoji or text"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {selectedBank ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default Banks; 