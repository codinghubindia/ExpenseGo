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
  MenuItem,
  Alert
} from '@mui/material';
import IconSelector from '../IconSelector';

const CategoryForm = ({ open, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    icon: '📁',
    colorCode: '#000000',
  });

  const [error, setError] = useState(null);

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

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Category name is required');
      return false;
    }

    if (!formData.colorCode.match(/^#[0-9A-F]{6}$/i)) {
      setError('Invalid color code format');
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      if (validateForm()) {
        onSubmit(formData);
        handleClose();
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'expense',
      icon: '📁',
      colorCode: '#000000',
    });
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Add error handling for color code validation
  const validateColorCode = (color) => {
    const isValid = /^#[0-9A-F]{6}$/i.test(color);
    if (!isValid) {
      setError('Invalid color code format');
      return false;
    }
    return true;
  };

  const handleColorChange = (e) => {
    const newColor = e.target.value;
    if (validateColorCode(newColor)) {
      setFormData({ ...formData, colorCode: newColor });
      setError(null);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>
        {initialData ? 'Edit Category' : 'New Category'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            error={!formData.name.trim()}
            helperText={!formData.name.trim() ? 'Name is required' : ''}
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
            onChange={handleColorChange}
            disabled={initialData?.isDefault}
            error={!formData.colorCode.match(/^#[0-9A-F]{6}$/i)}
            helperText={!formData.colorCode.match(/^#[0-9A-F]{6}$/i) ? 'Invalid color format' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={!formData.name.trim() || !formData.colorCode.match(/^#[0-9A-F]{6}$/i)}
          >
            {initialData ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CategoryForm;