/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
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
  Box
} from '@mui/material';
import { ChromePicker } from 'react-color';

const CategoryForm = ({ open, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    colorCode: '#000000',
    icon: '📁'
  });

  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    // Reset form when opening
    if (open) {
      setFormData(initialData ? {
        name: initialData.name || '',
        type: initialData.type || 'expense',
        colorCode: initialData.colorCode || initialData.color || '#000000',
        icon: initialData.icon || '📁'
      } : {
        name: '',
        type: 'expense',
        colorCode: '#000000',
        icon: '📁'
      });
    }
  }, [open, initialData]);

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleColorChange = (color) => {
    setFormData(prev => ({
      ...prev,
      colorCode: color.hex
    }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialData ? 'Edit Category' : 'New Category'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Name"
            value={formData.name}
            onChange={handleChange('name')}
            fullWidth
            required
          />

          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.type}
              onChange={handleChange('type')}
              label="Type"
            >
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="income">Income</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Icon"
            value={formData.icon}
            onChange={handleChange('icon')}
            fullWidth
          />

          <Box>
            <Button
              variant="outlined"
              onClick={() => setShowColorPicker(!showColorPicker)}
              style={{ backgroundColor: formData.colorCode }}
            >
              Pick Color
            </Button>
            {showColorPicker && (
              <Box sx={{ position: 'absolute', zIndex: 2 }}>
                <Box
                  sx={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0
                  }}
                  onClick={() => setShowColorPicker(false)}
                />
                <ChromePicker
                  color={formData.colorCode}
                  onChange={handleColorChange}
                />
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!formData.name}
        >
          {initialData ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryForm; 