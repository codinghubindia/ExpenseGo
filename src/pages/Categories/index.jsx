/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import CategoryForm from '../../components/CategoryForm';
import DatabaseService from '../../services/DatabaseService';

const CATEGORY_ICONS = [
  { icon: '🛒', label: 'Shopping' },
  { icon: '🍽️', label: 'Food & Dining' },
  { icon: '🏠', label: 'Housing' },
  { icon: '🚗', label: 'Transportation' },
  { icon: '💊', label: 'Healthcare' },
  { icon: '🎮', label: 'Entertainment' },
  { icon: '📚', label: 'Education' },
  { icon: '💼', label: 'Business' },
  { icon: '✈️', label: 'Travel' },
  { icon: '🏦', label: 'Banking' },
  { icon: '📱', label: 'Utilities' },
  { icon: '🎁', label: 'Gifts' },
  { icon: '💰', label: 'Income' },
  { icon: '💳', label: 'Credit Card' },
  { icon: '🏢', label: 'Rent' }
];

// eslint-disable-next-line no-unused-vars
const IconSelector = ({ value, onChange, disabled }) => (
  <FormControl fullWidth margin="dense">
    <InputLabel>Icon</InputLabel>
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      renderValue={(selected) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <span style={{ fontSize: '1.5rem' }}>{selected}</span>
          <Typography variant="body2">
            {CATEGORY_ICONS.find(item => item.icon === selected)?.label || 'Custom Icon'}
          </Typography>
        </Box>
      )}
    >
      {CATEGORY_ICONS.map((item) => (
        <MenuItem key={item.icon} value={item.icon}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
            <Typography>{item.label}</Typography>
          </Box>
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const bankId = 1; // TODO: Get from context
      const year = new Date().getFullYear();
      
      // Initialize database first
      await DatabaseService.initializeDatabase();
      
      // Create tables if they don't exist
      await DatabaseService.createBankYearTables(bankId, year);
      
      // Ensure default categories exist
      await DatabaseService.createDefaultCategories(bankId, year);
      
      // Get all categories including defaults
      const data = await DatabaseService.getCategories(bankId, year);
      
      if (!data || data.length === 0) {
        console.warn('No categories found, creating defaults...');
        await DatabaseService.createDefaultCategories(bankId, year);
        const freshData = await DatabaseService.getCategories(bankId, year);
        setCategories(freshData || []);
      } else {
        setCategories(data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setError('Failed to load categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (categoryData) => {
    try {
      setError(null);
      const bankId = 1;
      const year = new Date().getFullYear();
      await DatabaseService.createCategory(bankId, year, categoryData);
      await loadCategories();
      setIsFormOpen(false);
    } catch (error) {
      setError('Failed to create category: ' + error.message);
    }
  };

  const handleUpdateCategory = async (categoryData) => {
    try {
      setError(null);
      const bankId = 1;
      const year = new Date().getFullYear();
      await DatabaseService.updateCategory(bankId, year, selectedCategory.categoryId, categoryData);
      await loadCategories();
      setIsFormOpen(false);
      setSelectedCategory(null);
    } catch (error) {
      setError('Failed to update category: ' + error.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      setError(null);
      const bankId = 1;
      const year = new Date().getFullYear();
      
      // Get category details first
      const categoryToDelete = categories.find(c => c.categoryId === categoryId);
      if (categoryToDelete?.isDefault) {
        setError('Cannot delete default categories');
        return;
      }
      
      await DatabaseService.deleteCategory(bankId, year, categoryId);
      await loadCategories();
    } catch (error) {
      setError(error.message || 'Failed to delete category');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Categories
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedCategory(null);
            setIsFormOpen(true);
          }}
        >
          Add Category
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }}>Loading categories...</Typography>
          </Box>
        ) : categories.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No categories found. Click "Add Category" to create one.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: { xs: 1, sm: 2 } }}>
                Expense Categories
              </Typography>
              <Stack spacing={{ xs: 1, sm: 2 }}>
                {categories.map((category) => (
                  <ListItem
                    key={category.categoryId}
                    sx={{
                      borderLeft: `4px solid ${category.colorCode || category.color || '#000000'}`,
                      opacity: category.isDefault ? 0.7 : 1
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <span>{category.icon}</span>
                          <Typography>
                            {category.name}
                            {category.isDefault && (
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{ ml: 1, color: 'text.secondary' }}
                              >
                                (Default)
                              </Typography>
                            )}
                          </Typography>
                        </Box>
                      }
                      secondary={category.type}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => {
                          setSelectedCategory(category);
                          setIsFormOpen(true);
                        }}
                        disabled={category.isDefault}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteCategory(category.categoryId)}
                        disabled={category.isDefault}
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </Stack>
            </Grid>
          </Grid>
        )}
      </Paper>

      <CategoryForm
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCategory(null);
        }}
        onSubmit={selectedCategory ? handleUpdateCategory : handleCreateCategory}
        initialData={selectedCategory}
      />
    </Container>
  );
};

export default Categories;