/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import IconSelector from '../IconSelector';

const CategoryForm = ({ open, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    icon: '📁',
    colorCode: '#000000',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        type: initialData.type,
        icon: initialData.icon,
        colorCode: initialData.colorCode || initialData.color || '#000000',
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {initialData ? 'Edit Category' : 'New Category'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          
          <FormControl fullWidth margin="dense">
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
            >
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="income">Income</MenuItem>
            </Select>
          </FormControl>

          <IconSelector
            value={formData.icon}
            onChange={(newIcon) => setFormData({ ...formData, icon: newIcon })}
            disabled={initialData?.isDefault}
          />

          <TextField
            margin="dense"
            label="Color"
            type="color"
            fullWidth
            value={formData.colorCode}
            onChange={(e) => setFormData({ ...formData, colorCode: e.target.value })}
            disabled={initialData?.isDefault}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            {initialData ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CategoryForm;