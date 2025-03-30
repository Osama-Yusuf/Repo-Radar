import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import axios from 'axios';
import { useSearch } from '../contexts/SearchContext';
import {
  PipelineCard,
  PipelineLogsDialog,
  TaskLogsDialog,
  PipelineSortSelect,
  sortPipelines
} from '../components/pipeline';

// Define the API base URL in the same way as App.jsx
const PORT = import.meta.env.VITE_PORT || '3001';
const API_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || `http://localhost:${PORT}/api`;
console.log(`API_BASE_URL (PipelineStatus): ${API_BASE_URL}`);

// Create a dedicated axios instance for this component
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

const PipelineStatus = () => {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskLogs, setTaskLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [pipelineLogs, setPipelineLogs] = useState(null);
  const [pipelineLogsLoading, setPipelineLogsLoading] = useState(false);
  const [sortOption, setSortOption] = useState('creationTime-desc');
  const { searchQuery } = useSearch();

  const fetchPipelines = async () => {
    try {
      const response = await apiClient.get('tekton/pipelineruns');
      setPipelines(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskLogs = async (pipelineName, taskName) => {
    setLogsLoading(true);
    try {
      const response = await apiClient.get(`/tekton/pipelineruns/${pipelineName}/logs/${taskName}`);
      setTaskLogs(response.data.logs || 'No logs available');
    } catch (err) {
      console.error('Error fetching logs:', err);
      setTaskLogs('Failed to fetch logs: ' + (err.response?.data?.error || err.message));
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchPipelineLogs = async (pipeline) => {
    setPipelineLogsLoading(true);
    try {
      const response = await apiClient.get(`/tekton/pipelineruns/${pipeline.name}/logs`);
      setPipelineLogs({
        pipeline,
        logs: response.data.logs || {}
      });
    } catch (err) {
      console.error('Error fetching pipeline logs:', err);
      setPipelineLogs({
        pipeline,
        error: 'Failed to fetch logs: ' + (err.response?.data?.error || err.message)
      });
    } finally {
      setPipelineLogsLoading(false);
    }
  };

  const handleOpenLogs = async (pipeline, task) => {
    setSelectedTask({ pipeline, task });
    await fetchTaskLogs(pipeline.name, task.name);
  };

  const handleOpenPipelineLogs = async (pipeline) => {
    await fetchPipelineLogs(pipeline);
  };

  const handleCloseLogs = () => {
    setSelectedTask(null);
    setTaskLogs('');
  };

  const handleClosePipelineLogs = () => {
    setPipelineLogs(null);
  };

  useEffect(() => {
    fetchPipelines();
    const interval = setInterval(fetchPipelines, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredPipelines = pipelines.filter(pipeline => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    // Search in pipeline name, status, and pipeline type
    const basicMatch = pipeline.name.toLowerCase().includes(query) ||
      pipeline.status.toLowerCase().includes(query) ||
      pipeline.pipeline.toLowerCase().includes(query);

    // Search in params if they exist
    const paramsMatch = pipeline.params?.some(param =>
      param.name.toLowerCase().includes(query) ||
      param.value.toLowerCase().includes(query)
    ) || false;

    return basicMatch || paramsMatch;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography color="error">Error: {error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#fff' }}>
          Pipeline Status
        </Typography>
        <PipelineSortSelect sortOption={sortOption} setSortOption={setSortOption} />
      </Box>

      <Grid container spacing={3}>
        {sortPipelines(filteredPipelines, sortOption).map((pipeline) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={pipeline.name}>
            <PipelineCard
              pipeline={pipeline}
              onOpenTaskLogs={handleOpenLogs}
              onOpenPipelineLogs={handleOpenPipelineLogs}
            />
          </Grid>
        ))}
      </Grid>

      <PipelineLogsDialog
        pipelineLogs={pipelineLogs}
        pipelineLogsLoading={pipelineLogsLoading}
        onClose={handleClosePipelineLogs}
      />

      <TaskLogsDialog
        selectedTask={selectedTask}
        taskLogs={taskLogs}
        logsLoading={logsLoading}
        onClose={handleCloseLogs}
      />
    </Container>
  );
};

export default PipelineStatus;
