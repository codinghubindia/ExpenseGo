import React, { useState, useEffect } from 'react';
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
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import CategoryForm from '../../components/CategoryForm';
import DatabaseService from '../../services/DatabaseService';

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
      
      // Clean up duplicates first
      await DatabaseService.cleanupDuplicateCategories(bankId, year);
      
      const data = await DatabaseService.getCategories(bankId, year);
      setCategories(data);
    } catch (error) {
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
        <List>
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
        </List>
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