import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress
} from '@mui/material';

const TaskLogsDialog = ({ selectedTask, taskLogs, logsLoading, onClose }) => {
  if (!selectedTask) {
    return null;
  }

  return (
    <Dialog
      open={!!selectedTask}
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
        <Button onClick={onClose} sx={{ color: '#fff' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskLogsDialog;
