import React, { useState, useEffect, useContext } from 'react'; // Added useContext
import axios from 'axios';
import { Container, Typography, CircularProgress, Box, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material'; // Added FormControl, InputLabel, Select, MenuItem
import DeploymentVulnerabilityCard from '../components/vulnerabilities/DeploymentVulnerabilityCard';
import AuthContext from '../contexts/AuthContext'; // Import AuthContext as default export

// Corrected API_BASE_URL definition using Vite environment variables
const PORT = import.meta.env.VITE_PORT || '3001';
const API_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || `http://localhost:${PORT}/api`;

// Create a dedicated axios instance for this component
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

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
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useContext(AuthContext); // Get token

  const [availableNamespaces, setAvailableNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState('');

  // Add Authorization header interceptor for apiClient
  useEffect(() => {
    const interceptor = apiClient.interceptors.request.use(
      config => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );
    return () => {
      apiClient.interceptors.request.eject(interceptor);
    };
  }, [token]);

  // Fetch available namespaces from settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) return;
      try {
        const response = await apiClient.get('/settings');
        if (response.data && response.data.kubernetes_namespaces && response.data.kubernetes_namespaces.length > 0) {
          setAvailableNamespaces(response.data.kubernetes_namespaces);
          setSelectedNamespace(response.data.kubernetes_namespaces[0]);
        } else {
          setAvailableNamespaces(['default']);
          setSelectedNamespace('default');
        }
      } catch (error) {
        console.error('Error fetching settings for namespaces:', error);
        setAvailableNamespaces(['default']);
        setSelectedNamespace('default');
        // Consider setting an error state here if namespace fetching is critical
      }
    };
    fetchSettings();
  }, [token]);

  // Fetch deployments when selectedNamespace changes
  useEffect(() => {
    const fetchDeployments = async (namespace) => {
      if (!namespace || !token) return;
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`/k8s/deployments-with-images?namespace=${namespace}`);
        setDeployments(response.data);
      } catch (err) {
        console.error("Error fetching deployments:", err);
        setError(err.response?.data?.message || err.message || 'Failed to fetch deployments');
        setDeployments([]); // Clear data on error
      } finally {
        setLoading(false);
      }
    };

    if (selectedNamespace) {
      fetchDeployments(selectedNamespace);
      // No interval refresh for deployments for now, can be added if needed
    }
  }, [selectedNamespace, token]);

  if (loading && deployments.length === 0) { // Show loading only if there are no deployments yet
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
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Deployment Vulnerabilities
        </Typography>
        {availableNamespaces.length > 0 && (
          <FormControl sx={{ m: 1, minWidth: 200 }} size="small">
            <InputLabel id="namespace-select-label-vuln" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Namespace</InputLabel>
            <Select
              labelId="namespace-select-label-vuln"
              value={selectedNamespace}
              label="Namespace"
              onChange={(e) => setSelectedNamespace(e.target.value)}
              sx={{
                color: '#fff',
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.23)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.7)' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2196f3' },
                '.MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.7)' },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: '#252536',
                    color: '#fff',
                    '& .MuiMenuItem-root': {
                      '&:hover': {
                        backgroundColor: 'rgba(33, 150, 243, 0.08)',
                      },
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(33, 150, 243, 0.15)',
                        '&:hover': {
                          backgroundColor: 'rgba(33, 150, 243, 0.25)',
                        },
                      },
                    },
                  },
                },
              }}
            >
              {availableNamespaces.map((ns) => (
                <MenuItem key={ns} value={ns}>{ns}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>
      {loading && <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 2, mb: 2 }} />}
      {!loading && deployments.length === 0 && (
        <Typography sx={{ textAlign: 'center', mt: 5 }}>
          No deployments found in namespace: {selectedNamespace || 'N/A'}.
        </Typography>
      )}
      {deployments.map((deployment) => (
        <DeploymentVulnerabilityCard
          key={`${deployment.namespace}-${deployment.deploymentName}`}
          deployment={deployment}
          selectedNamespace={selectedNamespace} // Pass selectedNamespace if card needs it
        />
      ))}
    </Container>
  );
};

export default DeploymentVulnerabilities;
