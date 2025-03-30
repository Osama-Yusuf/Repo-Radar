import React, { useState, useEffect } from 'react';
import { Container, Typography, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useSearch } from '../contexts/SearchContext';

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

  const fetchPods = async () => {
    try {
      const response = await apiClient.get('/k8s/pods');
      setPods(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPodLogs = async (podName) => {
    setLogsLoading(true);
    try {
      const response = await apiClient.get(`/k8s/pods/${podName}/logs`);
      setPodLogs(response.data.logs || 'No logs available');
    } catch (err) {
      console.error('Error fetching logs:', err);
      setPodLogs('Failed to fetch logs');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchPods();
    const interval = setInterval(fetchPods, 5000);
    return () => clearInterval(interval);
  }, []);

  // Set search term from the global search context
  useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery]);

  const handleOpenPodLogs = async (pod) => {
    setSelectedPod(pod);
    await fetchPodLogs(pod.name);
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <PodList
        pods={pods}
        loading={loading}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortOption={sortOption}
        setSortOption={setSortOption}
        onOpenPodLogs={handleOpenPodLogs}
        onRefresh={fetchPods}
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
