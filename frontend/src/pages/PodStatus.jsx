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
  Paper,
  IconButton,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import {
  Terminal as LogsIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Pending as PendingIcon,
  PlayArrow as RunningIcon,
  Error as ErrorIcon,
  AccessTime,
  GitHub
} from '@mui/icons-material';
import axios from 'axios';
import { useSearch } from '../contexts/SearchContext';

const PodStatus = () => {
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPod, setSelectedPod] = useState(null);
  const [podLogs, setPodLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);
  const [sortOption, setSortOption] = useState('creationTime-desc');
  const { searchQuery } = useSearch();

  const sortOptions = [
    { value: 'creationTime-desc', label: 'Newest First' },
    { value: 'creationTime-asc', label: 'Oldest First' },
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'status-asc', label: 'Status (Running First)' },
    { value: 'status-desc', label: 'Status (Failed First)' },
    { value: 'restarts-asc', label: 'Restarts (Low to High)' },
    { value: 'restarts-desc', label: 'Restarts (High to Low)' }
  ];

  const sortPods = (pods) => {
    const [field, order] = sortOption.split('-');
    return [...pods].sort((a, b) => {
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
            'Running': 1,
            'Pending': 2,
            'Succeeded': 3,
            'Failed': 4,
            'Unknown': 5,
            'CrashLoopBackOff': 6
          };
          const statusA = statusOrder[a.status] || 999;
          const statusB = statusOrder[b.status] || 999;
          return order === 'desc'
            ? statusB - statusA
            : statusA - statusB;
        case 'restarts':
          return order === 'desc'
            ? b.restarts - a.restarts
            : a.restarts - b.restarts;
        default:
          return 0;
      }
    });
  };

  const fetchPods = async () => {
    try {
      const response = await axios.get('/api/k8s/pods');
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
      const response = await axios.get(`/api/k8s/pods/${podName}/logs`);
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

  const handleOpenLogs = async (pod) => {
    setSelectedPod(pod);
    await fetchPodLogs(pod.name);
  };

  const handleCloseLogs = () => {
    setSelectedPod(null);
    setPodLogs('');
  };

  const getPodStatus = (pod) => {
    // Check for CrashLoopBackOff
    if (pod.restarts > 5) {
      return {
        status: 'CrashLoopBackOff',
        color: '#ff5252',
        icon: <RunningIcon />,
        bgColor: 'rgba(255, 82, 82, 0.1)',
        borderColor: 'rgba(255, 82, 82, 0.3)'
      };
    }

    // Check container statuses
    const containerStatuses = pod.containerStatuses || [];
    const hasFailedContainer = containerStatuses.some(
      status => status.state?.waiting?.reason === 'CrashLoopBackOff' ||
                status.state?.waiting?.reason === 'Error'
    );

    if (hasFailedContainer) {
      return {
        status: 'Failed',
        color: '#ff5252',
        icon: <ErrorIcon />,
        bgColor: 'rgba(255, 82, 82, 0.1)',
        borderColor: 'rgba(255, 82, 82, 0.3)'
      };
    }

    const statusMap = {
      running: {
        color: '#4caf50',
        icon: <SuccessIcon />,
        bgColor: 'rgba(76, 175, 80, 0.1)',
        borderColor: 'rgba(76, 175, 80, 0.3)'
      },
      pending: {
        color: '#ffc107',
        icon: <PendingIcon />,
        bgColor: 'rgba(255, 193, 7, 0.1)',
        borderColor: 'rgba(255, 193, 7, 0.3)'
      },
      failed: {
        color: '#ff5252',
        icon: <ErrorIcon />,
        bgColor: 'rgba(255, 82, 82, 0.1)',
        borderColor: 'rgba(255, 82, 82, 0.3)'
      },
      succeeded: {
        color: '#2196f3',
        icon: <SuccessIcon />,
        bgColor: 'rgba(33, 150, 243, 0.1)',
        borderColor: 'rgba(33, 150, 243, 0.3)'
      },
      unknown: {
        color: '#757575',
        icon: <WarningIcon />,
        bgColor: 'rgba(117, 117, 117, 0.1)',
        borderColor: 'rgba(117, 117, 117, 0.3)'
      }
    };

    return statusMap[pod.status.toLowerCase()] || statusMap.unknown;
  };

  const filteredPods = pods.filter(pod => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    // Extract commit hash from image if it exists
    const commitHash = pod.image ? (pod.image.match(/:([a-f0-9]{7})--/) || [])[1] : '';
    
    // Clean up the search query to handle various formats
    const cleanQuery = query.replace(/[^a-f0-9]/g, '');
    
    return (
      pod.name.toLowerCase().includes(query) ||
      pod.status.toLowerCase().includes(query) ||
      (commitHash && (
        // Match original query (might include special characters)
        commitHash.includes(query) ||
        // Match cleaned query (only alphanumeric)
        (cleanQuery.length > 0 && commitHash.includes(cleanQuery))
      ))
    );
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
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 3 
          }}>
            <Typography variant="h5" sx={{ color: '#fff' }}>
              Pod Status
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
        </Grid>

        {sortPods(filteredPods).map((pod) => {
          const statusInfo = getPodStatus(pod);
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={pod.name}>
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
                      POD NAME
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
                      {pod.name}
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
                        <AccessTime sx={{ fontSize: '1rem' }} />
                        Created {new Date(pod.creationTime).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Tooltip title="View Logs">
                    <IconButton 
                      size="small"
                      onClick={() => handleOpenLogs(pod)}
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': { color: '#fff', background: 'rgba(255, 255, 255, 0.1)' }
                      }}
                    >
                      <LogsIcon fontSize="small" />
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
                        {statusInfo.status || pod.status}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.5)',
                        display: 'block',
                        mb: 0.5
                      }}
                    >
                      Ready
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#fff',
                        fontWeight: 500
                      }}
                    >
                      {pod.ready}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.5)',
                        display: 'block',
                        mb: 0.5
                      }}
                    >
                      Restarts
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 500,
                        color: pod.restarts > 0 ? '#ff9800' : '#fff'
                      }}
                    >
                      {pod.restarts}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.5)',
                        display: 'block',
                        mb: 0.5
                      }}
                    >
                      Age
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: '#fff',
                        fontWeight: 500
                      }}
                    >
                      {pod.age}
                    </Typography>
                  </Grid>
                  {pod.image && (() => {
                    const match = pod.image.match(/:([a-f0-9]{7})--/);
                    if (match) {
                      return (
                        <Grid item xs={12} sx={{ mt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)', pt: 2 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}
                          >
                            <Tooltip title="Latest deployed commit hash" placement="top" arrow>
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  px: 1.5,
                                  py: 0.75,
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                  border: '1px solid rgba(33, 150, 243, 0.2)',
                                  color: '#2196f3',
                                  fontSize: '0.85rem',
                                  fontFamily: 'monospace',
                                  letterSpacing: '0.5px',
                                  fontWeight: 500,
                                  cursor: 'default',
                                  transition: 'all 0.2s ease-in-out',
                                  '&:hover': {
                                    backgroundColor: 'rgba(33, 150, 243, 0.15)',
                                    borderColor: 'rgba(33, 150, 243, 0.3)',
                                    transform: 'translateY(-1px)'
                                  }
                                }}
                              >
                                <GitHubIcon sx={{ fontSize: '1rem', mr: 0.5, opacity: 0.7 }} />
                                <Typography component="span" sx={{ opacity: 0.7, mr: 0.5, fontSize: '0.8rem' }}>
                                  commit
                                </Typography>
                                {match[1]}
                              </Box>
                            </Tooltip>
                          </Box>
                        </Grid>
                      );
                    }
                    return null;
                  })()}
                </Grid>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      <Dialog
        open={!!selectedPod}
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
        <DialogTitle sx={{ color: '#fff', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {selectedPod?.name} - Logs
        </DialogTitle>
        <DialogContent>
          {logsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Paper sx={{ 
              p: 2, 
              mt: 2,
              background: 'rgba(0, 0, 0, 0.3)',
              maxHeight: '500px',
              overflow: 'auto',
              borderRadius: '8px'
            }}>
              <pre style={{ 
                color: '#fff', 
                margin: 0, 
                whiteSpace: 'pre-wrap',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.85rem'
              }}>
                {podLogs || 'No logs available'}
              </pre>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <Button 
            onClick={handleCloseLogs}
            variant="contained"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PodStatus;
