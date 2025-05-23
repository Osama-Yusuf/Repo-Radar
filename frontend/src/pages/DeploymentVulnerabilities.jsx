import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Typography, CircularProgress, Box, Alert, Paper } from '@mui/material';
import DeploymentVulnerabilityCard from '../components/vulnerabilities/DeploymentVulnerabilityCard'; // Import the card
import { SecurityTwoTone as SecurityIcon } from '@mui/icons-material';

/**
 * @component DeploymentVulnerabilities
 * @description This page component fetches and displays a list of Kubernetes deployments
 * from the `/api/k8s/deployments-with-images` endpoint. For each deployment,
 * it renders a `DeploymentVulnerabilityCard` component, which is responsible for
 * displaying detailed information and vulnerability scan results for the deployment's primary image.
 * The component handles loading states for the initial deployment fetch and displays
 * an error message (using MUI Alert) if this fetch operation fails.
 */
const DeploymentVulnerabilities = () => {
  // State: deployments - Stores the array of deployment objects fetched from the API.
  const [deployments, setDeployments] = useState([]);
  // State: loading - Boolean indicating if the initial list of deployments is being fetched.
  const [loading, setLoading] = useState(true);
  // State: error - Stores any error object or message if fetching deployments fails.
  const [error, setError] = useState(null);

  const PORT = import.meta.env.VITE_PORT || '3001';
  const API_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || `http://localhost:${PORT}/api`;

  // useEffect: Fetches the list of deployments when the component mounts.
  // It sets the loading state, makes an API call, and updates either
  // the deployments state on success or the error state on failure.
  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        setLoading(true); // Indicate that data loading has started.
        setError(null); // Reset any previous errors.
        const response = await axios.get(`${API_BASE_URL}/k8s/deployments-with-images`);
        setDeployments(response.data); // Store the fetched deployments.
      } catch (err) {
        console.error("Error fetching deployments:", err);
        // Set a user-friendly error message, preferring backend's message if available.
        setError(err.response?.data?.message || err.message || 'Failed to fetch deployments');
      } finally {
        setLoading(false); // Indicate that data loading has finished.
      }
    };

    fetchDeployments();
  }, []); // Empty dependency array ensures this effect runs only once on mount.

  // Conditional Rendering: Display a loading spinner while data is being fetched.
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          <Typography variant="h6">Error</Typography>
          <Typography>{error}</Typography>
        </Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Deployment Vulnerabilities
      </Typography>
      {deployments.length === 0 && !loading && (
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
              <SecurityIcon
                sx={{
                  fontSize: 64,
                  color: 'rgba(25, 118, 210, 0.8)'
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
              No Deployments Found
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                maxWidth: 500,
                mb: 2
              }}
            >
              There are no active deployments at the moment. Deployments with vulnerability information will appear here when they're created.
            </Typography>
          </Box>
        </Paper>
      )}
      {deployments.map((deployment) => (
        <DeploymentVulnerabilityCard key={deployment.deploymentName} deployment={deployment} />
      ))}
    </Container>
  );
};

export default DeploymentVulnerabilities;
