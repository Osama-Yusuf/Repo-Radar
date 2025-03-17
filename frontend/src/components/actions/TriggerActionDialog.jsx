import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useState } from 'react';

const TriggerActionDialog = ({ open, onClose, project, onTrigger }) => {
  const [selectedBranch, setSelectedBranch] = useState('');
  // eslint-disable-next-line react/prop-types
  const branches = project?.branches || [];

  const handleTrigger = () => {
    if (selectedBranch) {
      onTrigger(selectedBranch);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#fff' }}>
            Trigger Actions
          </Typography>
          <IconButton 
            onClick={onClose}
            sx={{
              color: '#90caf9',
              '&:hover': {
                background: 'rgba(33, 150, 243, 0.1)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '&.Mui-focused': {
                color: '#2196f3',
              },
            }}>Select Branch</InputLabel>
            <Select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              label="Select Branch"
              sx={{
                color: '#fff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#2196f3',
                },
                '& .MuiSvgIcon-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
              }}
            >
              {branches.map((branch) => (
                <MenuItem key={branch} value={branch}>
                  {branch}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            color: '#90caf9',
            borderColor: '#90caf9',
            '&:hover': {
              borderColor: '#2196f3',
              background: 'rgba(33, 150, 243, 0.1)',
            },
          }}
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={handleTrigger}
          disabled={!selectedBranch}
          variant="contained"
          sx={{
            background: 'linear-gradient(45deg, #2196f3 30%, #21CBF3 90%)',
            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
            color: 'white',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(45deg, #1976d2 30%, #00a0c2 90%)',
            },
            '&.Mui-disabled': {
              background: 'rgba(255, 255, 255, 0.12)',
              color: 'rgba(255, 255, 255, 0.3)',
            },
          }}
        >
          Trigger Actions
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TriggerActionDialog;
