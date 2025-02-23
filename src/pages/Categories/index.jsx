/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Box,
  Alert,
  Stack,
  Tooltip,
  CircularProgress,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
  Avatar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Category as CategoryIcon,
  ShoppingCart,
  Restaurant,
  School,
  DirectionsCar,
  LocalHospital,
  LocalPlay,
  FlightTakeoff,
  AccountBalance,
  Receipt,
  Payments
} from '@mui/icons-material';
import CategoryForm from '../../components/CategoryForm';
import DatabaseService from '../../services/DatabaseService';
import { useApp } from '../../contexts/AppContext';

const Categories = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentBank, currentYear } = useApp();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    loadCategories();
  }, [currentBank, currentYear]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      
      await DatabaseService.initializeDatabase();
      await DatabaseService.createBankYearTables(bankId, year);
      await DatabaseService.createDefaultCategories(bankId, year);
      
      const data = await DatabaseService.getCategories(bankId, year);
      setCategories(data || []);
      setError(null);
    } catch (error) {
      setError('Failed to load categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (categoryData) => {
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      await DatabaseService.addCategory(bankId, year, categoryData);
      await loadCategories();
      setIsFormOpen(false);
      setError(null);
    } catch (error) {
      setError('Failed to create category: ' + error.message);
    }
  };

  const handleUpdateCategory = async (categoryData) => {
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      const tableName = `categories_${bankId}_${year}`;

      // Prepare the category data
      const updatedCategory = {
        name: categoryData.name,
        type: categoryData.type,
        color_code: categoryData.colorCode,
        icon: categoryData.icon,
        updated_at: new Date().toISOString()
      };

      // Use direct SQL update instead of addCategory
      await DatabaseService.db.exec(`
        UPDATE ${tableName}
        SET name = ?,
            type = ?,
            color_code = ?,
            icon = ?,
            updated_at = ?
        WHERE category_id = ?
      `, [
        updatedCategory.name,
        updatedCategory.type,
        updatedCategory.color_code,
        updatedCategory.icon,
        updatedCategory.updated_at,
        selectedCategory.categoryId
      ]);

      await DatabaseService.saveToIndexedDB();
      await loadCategories();
      setIsFormOpen(false);
      setSelectedCategory(null);
      setError(null);
    } catch (error) {
      setError('Failed to update category: ' + error.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      const bankId = currentBank?.bankId || 1;
      const year = currentYear || new Date().getFullYear();
      
      const categoryToDelete = categories.find(c => c.categoryId === categoryId);
      if (categoryToDelete?.isDefault) {
        setError('Cannot delete default categories');
        return;
      }
      
      await DatabaseService.deleteCategory(bankId, year, categoryId);
      await loadCategories();
      setError(null);
    } catch (error) {
      setError(error.message || 'Failed to delete category');
    }
  };

  const getCategoryIcon = (categoryName) => {
    switch(categoryName?.toLowerCase()) {
      case 'shopping': return <ShoppingCart />;
      case 'food & dining': return <Restaurant />;
      case 'education': return <School />;
      case 'transportation': return <DirectionsCar />;
      case 'healthcare': return <LocalHospital />;
      case 'entertainment': return <LocalPlay />;
      case 'travel': return <FlightTakeoff />;
      case 'bills & utilities': return <Receipt />;
      case 'income': return <Payments />;
      default: return <CategoryIcon />;
    }
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
              Categories
            </Typography>
            <Typography color="text.secondary" variant="body1">
              Manage your expense and income categories
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2}
              justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
            >
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadCategories}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedCategory(null);
                  setIsFormOpen(true);
                }}
                disabled={loading}
              >
                Add Category
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={4}>
          {/* Expense Categories */}
          <Grid item xs={12} md={6}>
            <Card>
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">
                  Expense Categories
                  <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                    ({expenseCategories.length})
                  </Typography>
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedCategory(null);
                    setIsFormOpen(true);
                  }}
                >
                  Add
                </Button>
              </Box>
              <Divider />
              <Stack spacing={1} sx={{ p: 2 }}>
                {expenseCategories.map((category) => (
                  <Card
                    key={category.categoryId}
                    elevation={0}
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      '&:hover': {
                        bgcolor: 'action.hover',
                        '& .category-actions': {
                          opacity: 1,
                          visibility: 'visible'
                        }
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: category.colorCode + '20',
                          color: category.colorCode,
                          width: 40,
                          height: 40
                        }}
                      >
                        {getCategoryIcon(category.name)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {category.name}
                          {category.isDefault && (
                            <Chip
                              label="Default"
                              size="small"
                              sx={{ ml: 1, bgcolor: 'primary.soft', color: 'primary.main' }}
                            />
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {category.type.charAt(0).toUpperCase() + category.type.slice(1)}
                        </Typography>
                      </Box>
                      <Box 
                        className="category-actions"
                        sx={{
                          opacity: 0,
                          visibility: 'hidden',
                          transition: 'all 0.2s ease-in-out',
                          display: 'flex',
                          gap: 1
                        }}
                      >
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedCategory(category);
                              setIsFormOpen(true);
                            }}
                            disabled={category.isDefault}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={category.isDefault ? "Cannot delete default category" : "Delete"}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteCategory(category.categoryId)}
                              disabled={category.isDefault}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Stack>
            </Card>
          </Grid>

          {/* Income Categories */}
          <Grid item xs={12} md={6}>
            <Card>
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">
                  Income Categories
                  <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                    ({incomeCategories.length})
                  </Typography>
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedCategory(null);
                    setIsFormOpen(true);
                  }}
                >
                  Add
                </Button>
              </Box>
              <Divider />
              <Stack spacing={1} sx={{ p: 2 }}>
                {incomeCategories.map((category) => (
                  <Card
                    key={category.categoryId}
                    elevation={0}
                    sx={{
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      '&:hover': {
                        bgcolor: 'action.hover',
                        '& .category-actions': {
                          opacity: 1,
                          visibility: 'visible'
                        }
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: category.colorCode + '20',
                          color: category.colorCode,
                          width: 40,
                          height: 40
                        }}
                      >
                        {getCategoryIcon(category.name)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {category.name}
                          {category.isDefault && (
                            <Chip
                              label="Default"
                              size="small"
                              sx={{ ml: 1, bgcolor: 'primary.soft', color: 'primary.main' }}
                            />
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {category.type.charAt(0).toUpperCase() + category.type.slice(1)}
                        </Typography>
                      </Box>
                      <Box 
                        className="category-actions"
                        sx={{
                          opacity: 0,
                          visibility: 'hidden',
                          transition: 'all 0.2s ease-in-out',
                          display: 'flex',
                          gap: 1
                        }}
                      >
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedCategory(category);
                              setIsFormOpen(true);
                            }}
                            disabled={category.isDefault}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={category.isDefault ? "Cannot delete default category" : "Delete"}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteCategory(category.categoryId)}
                              disabled={category.isDefault}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Stack>
            </Card>
          </Grid>
        </Grid>
      )}

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