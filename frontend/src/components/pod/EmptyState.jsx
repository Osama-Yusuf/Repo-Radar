import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const EmptyState = () => {
  return (
    <Paper
      sx={{
        p: 5,
        borderRadius: '16px',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        mt: 4
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 5
        }}
      >
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(25, 118, 210, 0.1)',
            mb: 3
          }}
        >
          <Box
            component="img"
            src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg"
            alt="No Pods"
            sx={{
              width: '64px',
              height: '64px',
              opacity: 0.8,
              filter: 'brightness(0.9) saturate(1.2)'
            }}
          />
        </Box>

        <Typography
          variant="h5"
          sx={{
            color: '#fff',
            fontWeight: 500,
            mb: 2
          }}
        >
          No Kubernetes Pods Found
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            maxWidth: 500,
            mb: 3,
            lineHeight: 1.6
          }}
        >
          There are currently no pods running in your Kubernetes cluster, or we couldn't retrieve them.
          Please check your connection to the cluster.
        </Typography>

      </Box>
    </Paper>
  );
};

export default EmptyState;
