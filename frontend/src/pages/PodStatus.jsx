import React, { useState, useEffect, useContext } from 'react'; // Added useContext
import { Container, Typography, CircularProgress, FormControl, InputLabel, Select, MenuItem, Box } from '@mui/material'; // Added FormControl, InputLabel, Select, MenuItem, Box
import axios from 'axios';
import { useSearch } from '../contexts/SearchContext';
import { AuthContext } from '../contexts/AuthContext'; // Import AuthContext for token

// Import our modular components
import PodList from '../components/pod/PodList';
import PodLogsDialog from '../components/pod/PodLogsDialog';

// Define the API base URL in the same way as App.jsx
const PORT = import.meta.env.VITE_PORT || '3001';
const API_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || `http://localhost:${PORT}/api`;
console.log(`API_BASE_URL (PodStatus): ${API_BASE_URL}`);

// Create a dedicated axios instance for this component
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

const PodStatus = () => {
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPod, setSelectedPod] = useState(null);
  const [podLogs, setPodLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [sortOption, setSortOption] = useState('creationTime-desc');
  const [searchTerm, setSearchTerm] = useState('');
  const { searchQuery } = useSearch();
  const { token } = useContext(AuthContext); // Get token for authenticated API calls

  const [availableNamespaces, setAvailableNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState('');

  // Add Authorization header interceptor
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
      if (!token) return; // Wait for token
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
        // setError('Failed to fetch namespace settings. Falling back to "default".');
      }
    };
    fetchSettings();
  }, [token]);


  const fetchPods = async (namespace) => {
    if (!namespace || !token) return;
    setLoading(true);
    try {
      const response = await apiClient.get(`/k8s/pods?namespace=${namespace}`);
      setPods(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setPods([]); // Clear pods on error to avoid showing stale data
    } finally {
      setLoading(false);
    }
  };

  const fetchPodLogs = async (podName, namespace) => {
    if (!namespace || !token) return;
    setLogsLoading(true);
    try {
      const response = await apiClient.get(`/k8s/pods/${podName}/logs?namespace=${namespace}`);
      setPodLogs(response.data.logs || 'No logs available');
    } catch (err) {
      console.error('Error fetching logs:', err);
      setPodLogs('Failed to fetch logs');
    } finally {
      setLogsLoading(false);
    }
  };

  // Fetch pods when selectedNamespace changes or on initial load (once selectedNamespace is set)
  useEffect(() => {
    if (selectedNamespace) {
      fetchPods(selectedNamespace);
      const interval = setInterval(() => fetchPods(selectedNamespace), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedNamespace, token]); // Add token dependency

  // Set search term from the global search context
  useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  const handleOpenPodLogs = async (pod) => {
    setSelectedPod(pod);
    await fetchPodLogs(pod.name, selectedNamespace); // Pass selectedNamespace
  };

  const handleClosePodLogs = () => {
    setSelectedPod(null);
    setPodLogs('');
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography color="error">Error: {error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 10 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>
          Pod Status
        </Typography>
        {availableNamespaces.length > 0 && (
          <FormControl sx={{ m: 1, minWidth: 200 }} size="small">
            <InputLabel id="namespace-select-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Namespace</InputLabel>
            <Select
              labelId="namespace-select-label"
              value={selectedNamespace}
              label="Namespace"
              onChange={(e) => setSelectedNamespace(e.target.value)}
              sx={{ 
                color: 'white', 
                '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                '.MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.7)' },
                backgroundColor: 'rgba(0,0,0,0.1)'
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: '#2a2a3e', // Dark background for dropdown
                    color: 'white',
                  },
                },
              }}
            >
              {availableNamespaces.map((ns) => (
                <MenuItem key={ns} value={ns} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}>{ns}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>
      <PodList
        pods={pods}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortOption={sortOption}
        setSortOption={setSortOption}
        onOpenPodLogs={handleOpenPodLogs}
        onRefresh={() => fetchPods(selectedNamespace)} // Refresh with selected namespace
      />

      <PodLogsDialog
        selectedPod={selectedPod}
        podLogs={podLogs}
        logsLoading={logsLoading}
        onClose={handleClosePodLogs}
      />
    </Container>
  );
};

export default PodStatus;
