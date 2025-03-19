import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  DialogActions,
  Button,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  Paper,
  IconButton
} from '@mui/material';
import {
  Terminal as LogsIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Pending as PendingIcon,
  PlayArrow as RunningIcon,
  AccessTime as AccessTimeIcon,
  DoneAll as DoneAllIcon,
  Timer as TimerIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useSearch } from '../contexts/SearchContext';

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

  const sortPipelines = (pipelines) => {
    const [field, order] = sortOption.split('-');
    return [...pipelines].sort((a, b) => {
      switch (field) {
        case 'creationTime':
          return order === 'desc'
            ? new Date(b.creationTime) - new Date(a.creationTime)
            : new Date(a.creationTime) - new Date(b.creationTime);
        case 'name':
          return order === 'desc'
            ? b.name.localeCompare(a.name)
            : a.name.localeCompare(b.name);
        case 'status':
          const statusOrder = {
            'Succeeded': 1,
            'Running': 2,
            'Unknown': 3,
            'Failed': 4
          };
          const statusA = statusOrder[a.status] || 999;
          const statusB = statusOrder[b.status] || 999;
          return order === 'desc'
            ? statusB - statusA
            : statusA - statusB;
        case 'duration':
          const getDurationInSeconds = (pipeline) => {
            if (!pipeline.startTime) return 0;
            const start = new Date(pipeline.startTime);
            const end = pipeline.completionTime ? new Date(pipeline.completionTime) : new Date();
            return (end - start) / 1000;
          };
          const durationA = getDurationInSeconds(a);
          const durationB = getDurationInSeconds(b);
          return order === 'desc'
            ? durationB - durationA
            : durationA - durationB;
        default:
          return 0;
      }
    });
  };

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

  const getPipelineStatus = (status) => {
    const statusMap = {
      succeeded: {
        color: '#4caf50',
        icon: <SuccessIcon />,
        bgColor: 'rgba(76, 175, 80, 0.1)',
        borderColor: 'rgba(76, 175, 80, 0.3)'
      },
      running: {
        color: '#2196f3',
        icon: <RunningIcon />,
        bgColor: 'rgba(33, 150, 243, 0.1)',
        borderColor: 'rgba(33, 150, 243, 0.3)'
      },
      failed: {
        color: '#ff5252',
        icon: <ErrorIcon />,
        bgColor: 'rgba(255, 82, 82, 0.1)',
        borderColor: 'rgba(255, 82, 82, 0.3)'
      },
      pending: {
        color: '#ffc107',
        icon: <PendingIcon />,
        bgColor: 'rgba(255, 193, 7, 0.1)',
        borderColor: 'rgba(255, 193, 7, 0.3)'
      },
      unknown: {
        color: '#757575',
        icon: <WarningIcon />,
        bgColor: 'rgba(117, 117, 117, 0.1)',
        borderColor: 'rgba(117, 117, 117, 0.3)'
      }
    };

    const normalizedStatus = status?.toLowerCase() || 'unknown';
    return statusMap[normalizedStatus] || statusMap.unknown;
  };

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
      </Box>

      <Grid container spacing={3}>
        {sortPipelines(filteredPipelines).map((pipeline) => {
          const statusInfo = getPipelineStatus(pipeline.status);
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={pipeline.name}>
              <Paper sx={{
                p: 2.5,
                height: '100%',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: `1px solid ${statusInfo.borderColor}`,
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 8px 24px ${statusInfo.bgColor}`,
                  background: 'rgba(255, 255, 255, 0.05)'
                }
              }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2,
                  pb: 2,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <Box sx={{ flex: 1, mr: 2 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        mb: 0.5,
                        fontSize: '0.75rem'
                      }}
                    >
                      PIPELINE NAME
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: '#fff',
                        fontWeight: 500,
                        wordBreak: 'break-word',
                        fontSize: '0.9rem',
                        mb: 1
                      }}
                    >
                      {pipeline.name.split('-').slice(0, -1).join('-')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        <AccessTimeIcon sx={{ fontSize: '1rem' }} />
                        Created {new Date(pipeline.creationTime).toLocaleString()}
                      </Typography>
                      {pipeline.completionTime && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          <DoneAllIcon sx={{ fontSize: '1rem' }} />
                          Completed {new Date(pipeline.completionTime).toLocaleString()}
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'rgba(255, 255, 255, 0.7)',
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5
                        }}
                      >
                        <TimerIcon sx={{ fontSize: '1rem' }} />
                        Duration: {pipeline.duration}
                      </Typography>
                    </Box>
                    {pipeline.message && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '0.75rem',
                          display: 'block',
                          mt: 0.5,
                          fontStyle: 'italic'
                        }}
                      >
                        {pipeline.message}
                      </Typography>
                    )}
                  </Box>
                  <Tooltip title="View All Task Logs">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenPipelineLogs(pipeline)}
                      sx={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': {
                          color: '#fff',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)'
                        }
                      }}
                    >
                      <LogsIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Box sx={{ mb: 2.5 }}>
                  <Box sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: '8px',
                    backgroundColor: statusInfo.bgColor,
                    border: `1px solid ${statusInfo.borderColor}`
                  }}>
                    <Box sx={{
                      color: statusInfo.color,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {statusInfo.icon}
                      <Typography sx={{ ml: 1, fontWeight: 500, fontSize: '0.85rem' }}>
                        {pipeline.status}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {pipeline.params && pipeline.params.length > 0 && (
                  <Box sx={{ mb: 2.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.5)',
                        display: 'block',
                        mb: 1
                      }}
                    >
                      Parameters
                    </Typography>
                    <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1
                    }}>
                      {pipeline.params.map((param) => (
                        <Box
                          key={param.name}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            px: 1,
                            py: 0.5,
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.08)',
                              borderColor: 'rgba(255, 255, 255, 0.2)'
                            }
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontWeight: 500,
                              fontSize: '0.75rem'
                            }}
                          >
                            {param.name}:
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: '#fff',
                              ml: 0.5,
                              fontSize: '0.75rem'
                            }}
                          >
                            {param.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.5)',
                        display: 'block',
                        mb: 0.5
                      }}
                    >
                      Pipeline
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#fff',
                        fontWeight: 500
                      }}
                    >
                      {pipeline.pipeline}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.5)',
                        display: 'block',
                        mb: 0.5
                      }}
                    >
                      Duration
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#fff',
                        fontWeight: 500
                      }}
                    >
                      {pipeline.duration}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.5)',
                        display: 'block',
                        mb: 1
                      }}
                    >
                      Tasks
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {pipeline.tasks.map((task) => {
                        const taskStatus = getPipelineStatus(task.status);
                        return (
                          <Box
                            key={task.name}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              p: 1,
                              borderRadius: '4px',
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.05)'
                              }
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor: taskStatus.color
                                }}
                              />
                              <Typography
                                variant="body2"
                                sx={{
                                  color: '#fff',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {task.name}
                              </Typography>
                            </Box>
                            <Tooltip title="View Logs">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenLogs(pipeline, task)}
                                sx={{
                                  color: 'rgba(255, 255, 255, 0.7)',
                                  '&:hover': {
                                    color: '#fff',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                  }
                                }}
                              >
                                <LogsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        );
                      })}
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Dialog
        open={!!pipelineLogs}
        onClose={handleClosePipelineLogs}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(30, 30, 30, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>
          {pipelineLogs ? `Pipeline Logs: ${pipelineLogs.pipeline.name}` : ''}
        </DialogTitle>
        <DialogContent>
          {pipelineLogsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          ) : pipelineLogs?.error ? (
            <Typography color="error" sx={{ p: 2 }}>
              {pipelineLogs.error}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {Object.entries(pipelineLogs?.logs || {}).map(([taskName, logs]) => (
                <Box key={taskName}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: '#fff',
                      mb: 1,
                      pb: 1,
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {taskName}
                  </Typography>
                  <Box
                    sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '8px',
                      p: 2,
                      maxHeight: '300px',
                      overflow: 'auto'
                    }}
                  >
                    <pre style={{ margin: 0, color: '#fff', fontSize: '0.85rem' }}>
                      {logs}
                    </pre>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePipelineLogs} sx={{ color: '#fff' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!selectedTask}
        onClose={handleCloseLogs}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(30, 30, 30, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>
          {selectedTask ? `${selectedTask.task.name} Logs` : ''}
        </DialogTitle>
        <DialogContent>
          {logsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                p: 2,
                maxHeight: '400px',
                overflow: 'auto'
              }}
            >
              <pre style={{ margin: 0, color: '#fff', fontSize: '0.85rem' }}>
                {taskLogs}
              </pre>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLogs} sx={{ color: '#fff' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PipelineStatus;
