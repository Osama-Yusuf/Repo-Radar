import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';

const PipelineLogsDialog = ({ pipelineLogs, pipelineLogsLoading, onClose }) => {
  // Dialog should open even if logs are still loading (pipelineLogs exists but might be empty)
  const isOpen = pipelineLogs !== null;
  
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
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
        {pipelineLogs ? `Pipeline Logs: ${pipelineLogs.pipeline.name}` : 'Pipeline Logs'}
      </DialogTitle>
      <DialogContent>
        {pipelineLogsLoading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 4 }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Loading pipeline logs...
            </Typography>
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
        <Button onClick={onClose} sx={{ color: '#fff' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PipelineLogsDialog;
