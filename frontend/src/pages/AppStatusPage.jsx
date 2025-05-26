import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, Box, CircularProgress, Button, IconButton,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Tooltip, Alert, Link as MuiLink, Card, CardContent, Grid
} from '@mui/material';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircleOutline as CheckCircleOutlineIcon, // For UP status
  ErrorOutline as ErrorOutlineIcon // For DOWN status
} from '@mui/icons-material';
import axios from 'axios';
import AuthContext from '../contexts/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer
} from 'recharts';

// Reconstruct API_BASE_URL and axiosInstance
const PORT = import.meta.env.VITE_PORT || '3001';
const API_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || `http://localhost:${PORT}/api`;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

const AppStatusPage = () => {
  const { currentUser } = useContext(AuthContext);
  const canModify = currentUser && currentUser.role !== 'guest'; // Simplified check

  const [endpoints, setEndpoints] = useState([]);
  const [loadingEndpoints, setLoadingEndpoints] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEndpointData, setCurrentEndpointData] = useState({
    id: null,
    name: '',
    url: '',
    check_interval_seconds: 60,
  });
  const [historyData, setHistoryData] = useState({}); // { endpointId: [history_records] }
  const [loadingHistoryId, setLoadingHistoryId] = useState(null);
  const [visibleHistoryId, setVisibleHistoryId] = useState(null); // Track which history is visible
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({
    open: false,
    endpointId: null,
    endpointName: '',
  });

  const fetchEndpoints = async () => {
    setLoadingEndpoints(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/status/endpoints');
      setEndpoints(response.data || []);
    } catch (err) {
      console.error('Error fetching endpoints:', err);
      setError('Failed to load endpoints. ' + (err.response?.data?.error || err.message));
      setEndpoints([]);
    } finally {
      setLoadingEndpoints(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const fetchHistory = async (endpointId) => {
    // If we're already showing this endpoint's history, toggle it off
    if (visibleHistoryId === endpointId) {
      setVisibleHistoryId(null);
      return;
    }

    setLoadingHistoryId(endpointId);
    setError(null);
    try {
      const response = await axiosInstance.get(`/status/endpoints/${endpointId}/history?range=7d`);
      setHistoryData(prev => ({ ...prev, [endpointId]: response.data || [] }));
      setVisibleHistoryId(endpointId); // Set the visible history ID to show the chart
    } catch (err) {
      console.error(`Error fetching history for endpoint ${endpointId}:`, err);
      setError(`Failed to load history for endpoint ${endpointId}. ` + (err.response?.data?.error || err.message));
      setHistoryData(prev => ({ ...prev, [endpointId]: [] }));
    } finally {
      setLoadingHistoryId(null);
    }
  };

  const handleOpenAddDialog = () => {
    setCurrentEndpointData({ id: null, name: '', url: '', check_interval_seconds: 60 });
    setIsEditing(false);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (endpoint) => {
    setCurrentEndpointData({
      id: endpoint.id,
      name: endpoint.name,
      url: endpoint.url,
      check_interval_seconds: endpoint.check_interval_seconds,
    });
    setIsEditing(true);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError(null); // Clear dialog-specific errors
  };

  const handleDialogInputChange = (event) => {
    const { name, value } = event.target;
    setCurrentEndpointData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEndpoint = async () => {
    if (!currentEndpointData.name.trim() || !currentEndpointData.url.trim()) {
      setError("Name and URL are required.");
      return;
    }
    try {
      let response;
      const payload = {
        name: currentEndpointData.name,
        url: currentEndpointData.url,
        check_interval_seconds: parseInt(currentEndpointData.check_interval_seconds, 10) || 60,
      };

      if (isEditing) {
        response = await axiosInstance.put(`/status/endpoints/${currentEndpointData.id}`, payload);
      } else {
        response = await axiosInstance.post('/status/endpoints', payload);
      }

      if (response.status === 200 || response.status === 201) {
        handleCloseDialog();
        fetchEndpoints(); // Refresh the list
      } else {
        setError(response.data?.error || "An unexpected error occurred.");
      }
    } catch (err) {
      console.error('Error saving endpoint:', err);
      setError('Failed to save endpoint. ' + (err.response?.data?.error || err.message));
    }
  };

  const handleOpenDeleteConfirm = (endpointId, endpointName) => {
    setShowDeleteConfirm({ open: true, endpointId, endpointName });
  };

  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm({ open: false, endpointId: null, endpointName: '' });
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm.endpointId) return;
    try {
      await axiosInstance.delete(`/status/endpoints/${showDeleteConfirm.endpointId}`);
      handleCloseDeleteConfirm();
      fetchEndpoints(); // Refresh the list
    } catch (err) {
      console.error('Error deleting endpoint:', err);
      setError('Failed to delete endpoint. ' + (err.response?.data?.error || err.message));
      handleCloseDeleteConfirm(); // Still close confirm dialog on error
    }
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Application Status
        </Typography>
        {canModify && (
          <Button
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            onClick={handleOpenAddDialog}
          >
            Add Custom Endpoint
          </Button>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Tooltip title="Refresh List">
          <IconButton onClick={fetchEndpoints} disabled={loadingEndpoints}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {loadingEndpoints ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
        </Box>
      ) : endpoints.length === 0 ? (
        <Card sx={{
          bgcolor: 'rgba(26, 32, 53, 0.7)',
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>
              No monitored endpoints found
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {canModify ? 'Click the "Add Custom Endpoint" button to start monitoring your first endpoint.' : 'No endpoints have been configured yet.'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{
          bgcolor: 'rgba(26, 32, 53, 0.7)',
          borderRadius: 2,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white' }}>Name</TableCell>
                  <TableCell sx={{ color: 'white' }}>URL</TableCell>
                  <TableCell sx={{ color: 'white' }}>Type</TableCell>
                  <TableCell sx={{ color: 'white' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white' }}>Last Checked</TableCell>
                  <TableCell sx={{ color: 'white' }}>Check Interval</TableCell>
                  <TableCell sx={{ color: 'white' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {endpoints.map((endpoint) => (
                  <React.Fragment key={endpoint.id}>
                    <TableRow>
                      <TableCell sx={{ color: 'white' }}>{endpoint.name}</TableCell>
                      <TableCell>
                        <MuiLink href={endpoint.url} target="_blank" rel="noopener noreferrer" sx={{ color: '#64B5F6' }}>
                          {endpoint.url}
                        </MuiLink>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={endpoint.type}
                          size="small"
                          sx={{
                            backgroundColor: endpoint.type === 'custom' ? 'rgba(156, 39, 176, 0.2)' : 'rgba(33, 150, 243, 0.2)',
                            color: endpoint.type === 'custom' ? '#CE93D8' : '#90CAF9',
                            border: endpoint.type === 'custom' ? '1px solid #CE93D8' : '1px solid #90CAF9'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {endpoint.latest_status ? (
                          <Tooltip title={endpoint.latest_status.status_ok ? 'UP' : `DOWN: ${endpoint.latest_status.error_message || `Status Code: ${endpoint.latest_status.status_code}`}`}>
                            <Chip
                              icon={endpoint.latest_status.status_ok ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
                              label={endpoint.latest_status.status_ok ? 'UP' : 'DOWN'}
                              color={endpoint.latest_status.status_ok ? 'success' : 'error'}
                              size="small"
                            />
                          </Tooltip>
                        ) : (
                          <Chip label="Unknown" size="small" color="default" />
                        )}
                      </TableCell>
                      <TableCell sx={{ color: 'white' }}>{endpoint.last_checked_at ? formatTimestamp(endpoint.last_checked_at) : 'Never'}</TableCell>
                      <TableCell sx={{ color: 'white' }}>{endpoint.check_interval_seconds}s</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {canModify && (
                            <>
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => handleOpenEditDialog(endpoint)} sx={{ color: 'white' }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" onClick={() => handleOpenDeleteConfirm(endpoint.id, endpoint.name)} sx={{ color: 'white' }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Button
                            size="small"
                            onClick={() => fetchHistory(endpoint.id)}
                            disabled={loadingHistoryId === endpoint.id}
                            sx={{
                              color: 'white',
                              bgcolor: visibleHistoryId === endpoint.id ? 'rgba(33, 150, 243, 0.3)' : 'transparent',
                              '&:hover': {
                                bgcolor: visibleHistoryId === endpoint.id ? 'rgba(33, 150, 243, 0.5)' : 'rgba(255, 255, 255, 0.1)'
                              }
                            }}
                          >
                            {loadingHistoryId === endpoint.id ?
                              <CircularProgress size={20} /> :
                              visibleHistoryId === endpoint.id ? "Hide History" : "View History"
                            }
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                    {visibleHistoryId === endpoint.id && historyData[endpoint.id] && (
                      <TableRow>
                        <TableCell colSpan={canModify ? 8 : 7} sx={{ py: 0, backgroundColor: 'rgba(30, 40, 60, 0.6)' }}>
                          <Box sx={{ p: 3 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, color: '#90CAF9' }}>
                              History for {endpoint.name}:
                            </Typography>
                            {historyData[endpoint.id].length > 0 ? (
                              <Box
                                sx={{
                                  width: '100%',
                                  height: 300,
                                  mt: 2,
                                  p: 2,
                                  borderRadius: 2,
                                  backgroundColor: 'rgba(22, 28, 36, 0.8)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                              >
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart
                                    data={historyData[endpoint.id].map(h => ({
                                      timestamp: new Date(h.timestamp).getTime(),
                                      responseTime: h.response_time_ms || 0,
                                      statusOk: h.status_ok ? 1 : 0,
                                      statusCode: h.status_code || 0,
                                      error: h.error_message,
                                      formattedTime: formatTimestamp(h.timestamp)
                                    }))}
                                    margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                    <XAxis
                                      dataKey="timestamp"
                                      type="number"
                                      domain={['dataMin', 'dataMax']}
                                      tickFormatter={(timestamp) => {
                                        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                      }}
                                      stroke="#90CAF9"
                                      tick={{ fill: '#90CAF9' }}
                                    />
                                    <YAxis
                                      yAxisId="left"
                                      orientation="left"
                                      stroke="#BB86FC"
                                      tick={{ fill: '#BB86FC' }}
                                      label={{
                                        value: 'Response Time (ms)',
                                        angle: -90,
                                        position: 'insideLeft',
                                        style: { fill: '#BB86FC' }
                                      }}
                                    />
                                    <YAxis
                                      yAxisId="right"
                                      orientation="right"
                                      stroke="#03DAC5"
                                      tick={{ fill: '#03DAC5' }}
                                      domain={[0, 1]}
                                      label={{
                                        value: 'Status',
                                        angle: 90,
                                        position: 'insideRight',
                                        style: { fill: '#03DAC5' }
                                      }}
                                    />
                                    <Tooltip
                                      contentStyle={{
                                        backgroundColor: 'rgba(22, 28, 36, 0.95)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                      }}
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const data = payload[0].payload;
                                          return (
                                            <Paper sx={{
                                              p: 1.5,
                                              boxShadow: 3,
                                              bgcolor: 'rgba(22, 28, 36, 0.95)',
                                              border: '1px solid rgba(255, 255, 255, 0.2)',
                                            }}>
                                              <Typography variant="subtitle2" sx={{ color: '#fff' }}>{data.formattedTime}</Typography>
                                              <Typography variant="body2" sx={{ color: data.statusOk ? '#4CAF50' : '#f44336', fontWeight: 'bold' }}>
                                                Status: {data.statusOk ? 'UP' : 'DOWN'}
                                              </Typography>
                                              <Typography variant="body2" sx={{ color: '#BB86FC' }}>
                                                Response Time: {data.responseTime} ms
                                              </Typography>
                                              {data.statusCode > 0 && (
                                                <Typography variant="body2" sx={{ color: '#90CAF9' }}>
                                                  Status Code: {data.statusCode}
                                                </Typography>
                                              )}
                                              {data.error && (
                                                <Typography variant="body2" sx={{ color: '#f44336', maxWidth: 250, wordBreak: 'break-word' }}>
                                                  Error: {data.error}
                                                </Typography>
                                              )}
                                            </Paper>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Legend
                                      wrapperStyle={{
                                        color: '#fff',
                                        paddingTop: '10px'
                                      }}
                                    />
                                    <Line
                                      yAxisId="left"
                                      type="monotone"
                                      dataKey="responseTime"
                                      name="Response Time (ms)"
                                      stroke="#BB86FC"
                                      activeDot={{ r: 8, fill: '#BB86FC', stroke: '#fff' }}
                                      dot={{ r: 4, fill: '#BB86FC', stroke: '#fff' }}
                                      strokeWidth={2}
                                    />
                                    <Line
                                      yAxisId="right"
                                      type="stepAfter"
                                      dataKey="statusOk"
                                      name="Status (UP/DOWN)"
                                      stroke="#03DAC5"
                                      dot={{ r: 5, fill: '#03DAC5', stroke: '#fff' }}
                                      strokeWidth={2}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </Box>
                            ) : (
                              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                                No history data for the selected range (7 days).
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{isEditing ? 'Edit Custom Endpoint' : 'Add Custom Endpoint'}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {isEditing ? 'Update the details of your custom monitored endpoint.' : 'Enter the details for the new custom endpoint you want to monitor.'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Name"
            type="text"
            fullWidth
            variant="outlined"
            value={currentEndpointData.name}
            onChange={handleDialogInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="url"
            label="URL (e.g., https://example.com/health)"
            type="url"
            fullWidth
            variant="outlined"
            value={currentEndpointData.url}
            onChange={handleDialogInputChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            name="check_interval_seconds"
            label="Check Interval (seconds, min 15)"
            type="number"
            fullWidth
            variant="outlined"
            value={currentEndpointData.check_interval_seconds}
            onChange={handleDialogInputChange}
            inputProps={{ min: 15 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveEndpoint} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirm.open}
        onClose={handleCloseDeleteConfirm}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the endpoint "{showDeleteConfirm.endpointName}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AppStatusPage;
