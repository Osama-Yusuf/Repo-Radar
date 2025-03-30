import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Box,
  Typography,
  CircularProgress,
  Paper
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
import { LinearScaleTwoTone as PipelineIcon } from '@mui/icons-material';

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
    // First set loading state and open dialog immediately
    setPipelineLogsLoading(true);
    setPipelineLogs({ pipeline, logs: {} }); // Initialize with empty logs
    
    // Then fetch the actual logs
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

  const sortedPipelines = sortPipelines(filteredPipelines, sortOption);
  const hasPipelines = sortedPipelines.length > 0;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#fff' }}>
          Pipeline Status
        </Typography>
        <PipelineSortSelect sortOption={sortOption} setSortOption={setSortOption} />
      </Box>

      {hasPipelines ? (
        <Grid container spacing={3}>
          {sortedPipelines.map((pipeline) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={pipeline.name}>
              <PipelineCard
                pipeline={pipeline}
                onOpenTaskLogs={handleOpenLogs}
                onOpenPipelineLogs={handleOpenPipelineLogs}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
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
              <PipelineIcon
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
              No Pipelines Found
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                maxWidth: 500,
                mb: 2
              }}
            >
              {searchQuery
                ? "No pipelines match your search criteria. Try adjusting your search terms."
                : "There are no active pipelines at the moment. New pipelines will appear here when they're created."}
            </Typography>
          </Box>
        </Paper>
      )}

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
