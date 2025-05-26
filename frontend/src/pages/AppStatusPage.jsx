import React, { useState, useEffect, useContext } from 'react';
import {
  Container, Typography, Box, CircularProgress, Button, IconButton,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField,
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Tooltip, Alert, Link as MuiLink
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
    setLoadingHistoryId(endpointId);
    setError(null);
    try {
      const response = await axiosInstance.get(`/status/endpoints/${endpointId}/history?range=7d`);
      setHistoryData(prev => ({ ...prev, [endpointId]: response.data || [] }));
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
        <Typography variant="h4" gutterBottom sx={{ color: 'text.primary' }}>
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
          <Typography sx={{ ml: 2 }}>Loading monitored endpoints...</Typography>
        </Box>
      ) : endpoints.length === 0 && !error ? (
        <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}>
          No endpoints are currently monitored.
        </Typography>
      ) : (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: '75vh' }}>
            <Table stickyHeader aria-label="application status table">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Checked</TableCell>
                  <TableCell>Resp. Time (ms)</TableCell>
                  <TableCell>Interval (s)</TableCell>
                  <TableCell>Type</TableCell>
                  {canModify && <TableCell>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {endpoints.map((endpoint) => (
                  <React.Fragment key={endpoint.id}>
                    <TableRow hover>
                      <TableCell>{endpoint.name}</TableCell>
                      <TableCell>
                        <MuiLink href={endpoint.url} target="_blank" rel="noopener noreferrer">
                          {endpoint.url}
                        </MuiLink>
                      </TableCell>
                      <TableCell>
                        {endpoint.latest_status ? (
                          <Tooltip title={endpoint.latest_status.status_ok ? 'UP' : `DOWN: ${endpoint.latest_status.error_message || `Status Code: ${endpoint.latest_status.status_code}` }`}>
                            <Chip
                              icon={endpoint.latest_status.status_ok ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
                              label={endpoint.latest_status.status_ok ? 'UP' : 'DOWN'}
                              color={endpoint.latest_status.status_ok ? 'success' : 'error'}
                              size="small"
                            />
                          </Tooltip>
                        ) : (
                          <Chip label="Pending" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{formatTimestamp(endpoint.latest_status?.timestamp)}</TableCell>
                      <TableCell>{endpoint.latest_status?.response_time_ms ?? 'N/A'}</TableCell>
                      <TableCell>{endpoint.check_interval_seconds}</TableCell>
                      <TableCell>{endpoint.type}</TableCell>
                      {canModify && (
                        <TableCell>
                          {endpoint.type === 'custom' && (
                            <>
                              <Tooltip title="Edit Endpoint">
                                <IconButton size="small" onClick={() => handleOpenEditDialog(endpoint)}>
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Endpoint">
                                <IconButton size="small" onClick={() => handleOpenDeleteConfirm(endpoint.id, endpoint.name)}>
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                           <Button size="small" onClick={() => fetchHistory(endpoint.id)} disabled={loadingHistoryId === endpoint.id}>
                            {loadingHistoryId === endpoint.id ? <CircularProgress size={20} /> : "View History"}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                    {historyData[endpoint.id] && (
                       <TableRow>
                         <TableCell colSpan={canModify ? 8 : 7} sx={{ py:0, backgroundColor: 'action.hover' }}>
                           <Box sx={{ p: 2 }}>
                             <Typography variant="subtitle2">History for {endpoint.name}:</Typography>
                             {historyData[endpoint.id].length > 0 ? (
                               <TableContainer component={Paper} sx={{maxHeight: 200, mt:1}}>
                                 <Table size="small" stickyHeader>
                                   <TableHead>
                                     <TableRow>
                                       <TableCell>Timestamp</TableCell>
                                       <TableCell>Status</TableCell>
                                       <TableCell>Code</TableCell>
                                       <TableCell>Response (ms)</TableCell>
                                       <TableCell>Error</TableCell>
                                     </TableRow>
                                   </TableHead>
                                   <TableBody>
                                     {historyData[endpoint.id].map(h => (
                                       <TableRow key={h.id}>
                                         <TableCell>{formatTimestamp(h.timestamp)}</TableCell>
                                         <TableCell>
                                            <Chip 
                                                label={h.status_ok ? 'UP' : 'DOWN'} 
                                                color={h.status_ok ? 'success' : 'error'}
                                                size="small"
                                            />
                                         </TableCell>
                                         <TableCell>{h.status_code ?? 'N/A'}</TableCell>
                                         <TableCell>{h.response_time_ms ?? 'N/A'}</TableCell>
                                         <TableCell>{h.error_message ?? 'N/A'}</TableCell>
                                       </TableRow>
                                     ))}
                                   </TableBody>
                                 </Table>
                               </TableContainer>
                             ) : (
                               <Typography variant="caption" sx={{display: 'block', mt:1}}>No history data for the selected range (7 days).</Typography>
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
        </Paper>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>{isEditing ? 'Edit Custom Endpoint' : 'Add Custom Endpoint'}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{mb:2}}>
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
            sx={{mb:2}}
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
            sx={{mb:2}}
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
