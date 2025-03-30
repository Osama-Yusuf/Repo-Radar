import React from 'react';
import { FormControl, Select, MenuItem } from '@mui/material';

// Dropdown component for sorting pipelines
const PipelineSortSelect = ({ sortOption, setSortOption }) => {
  const sortOptions = [
    { value: 'creationTime-desc', label: 'Newest First' },
    { value: 'creationTime-asc', label: 'Oldest First' },
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'status-asc', label: 'Status (Success First)' },
    { value: 'status-desc', label: 'Status (Failed First)' },
    { value: 'duration-asc', label: 'Duration (Shortest First)' },
    { value: 'duration-desc', label: 'Duration (Longest First)' }
  ];

  return (
    <FormControl
      variant="outlined"
      size="small"
      sx={{
        minWidth: 200,
        '& .MuiOutlinedInput-root': {
          color: '#fff',
          '& fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.23)',
          },
          '&:hover fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.4)',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#fff',
          },
        },
        '& .MuiSelect-icon': {
          color: 'rgba(255, 255, 255, 0.7)',
        }
      }}
    >
      <Select
        value={sortOption}
        onChange={(e) => setSortOption(e.target.value)}
        MenuProps={{
          PaperProps: {
            sx: {
              bgcolor: 'rgba(30, 30, 30, 0.95)',
              backdropFilter: 'blur(10px)',
              '& .MuiMenuItem-root': {
                color: '#fff',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
                '&.Mui-selected': {
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                  },
                },
              },
            },
          },
        }}
      >
        {sortOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default PipelineSortSelect;
