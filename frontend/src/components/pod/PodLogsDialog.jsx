import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Paper,
  CircularProgress
} from '@mui/material';

const PodLogsDialog = ({ selectedPod, podLogs, logsLoading, onClose }) => {
  if (!selectedPod) {
    return null;
  }

  return (
    <Dialog
      open={!!selectedPod}
      onClose={onClose}
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
          onClick={onClose}
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
  );
};

export default PodLogsDialog;
