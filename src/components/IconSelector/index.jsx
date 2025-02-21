/* eslint-disable react/prop-types */
import { Box, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';

export const CATEGORY_ICONS = [
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

export default IconSelector;