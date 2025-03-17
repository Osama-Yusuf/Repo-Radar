import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box,
  Grid,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Terminal as LogsIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Pending as PendingIcon,
  Refresh as RefreshIcon,
  RestartAlt as RestartIcon,
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
  const { searchQuery } = useSearch();

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
        icon: <RestartIcon />,
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
    return (
      pod.name.toLowerCase().includes(query) ||
      pod.status.toLowerCase().includes(query)
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#fff' }}>
          Pod Status
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchPods} sx={{ color: '#fff' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Grid container spacing={3}>
        {filteredPods.map((pod) => {
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
                        fontSize: '0.9rem'
                      }}
                    >
                      {pod.name}
                    </Typography>
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
