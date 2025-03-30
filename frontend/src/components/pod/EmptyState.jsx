import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

const EmptyState = ({ onRefresh }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        textAlign: 'center',
        minHeight: '300px'
      }}
    >
      <Box
        component="img"
        src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg"
        alt="No Pods"
        sx={{
          width: '80px',
          height: '80px',
          mb: 3,
          opacity: 0.5,
          filter: 'grayscale(100%)'
        }}
      />

      <Typography
        variant="h6"
        sx={{
          color: 'rgba(255, 255, 255, 0.87)',
          fontWeight: 500,
          mb: 1
        }}
      >
        No Kubernetes Pods Found
      </Typography>

      <Typography
        variant="body2"
        sx={{
          color: 'rgba(255, 255, 255, 0.6)',
          maxWidth: '450px',
          mb: 3,
          lineHeight: 1.6
        }}
      >
        There are currently no pods running in your Kubernetes cluster, or we couldn't retrieve them.
        Please check your connection to the cluster or try refreshing.
      </Typography>

      <Button
        variant="outlined"
        startIcon={<RefreshIcon />}
        onClick={onRefresh}
        sx={{
          borderColor: 'rgba(255, 255, 255, 0.23)',
          color: '#fff',
          '&:hover': {
            borderColor: '#fff',
            backgroundColor: 'rgba(255, 255, 255, 0.08)'
          }
        }}
      >
        Refresh
      </Button>
    </Box>
  );
};

export default EmptyState;
