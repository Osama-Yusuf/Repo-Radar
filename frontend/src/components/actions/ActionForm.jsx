import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Button,
  Chip,
  DialogActions,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid
} from '@mui/material';
import { Add as AddIcon, ExpandMore as ExpandMoreIcon, Delete as DeleteIcon } from '@mui/icons-material';
import GitHubIcon from '@mui/icons-material/GitHub';

const ActionForm = ({
  actionFormData,
  setActionFormData,
  editingAction,
  onSaveAction,
  onClose,
  secrets,
  newSecret,
  setNewSecret,
  onAddSecret,
  onDeleteSecret,
  branches
}) => {
  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      color: '#fff',
      '& fieldset': {
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(255, 255, 255, 0.3)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#2196f3',
      },
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.7)',
      '&.Mui-focused': {
        color: '#2196f3',
      },
    },
    '& .MuiSelect-icon': {
      color: 'rgba(255, 255, 255, 0.7)',
    },
  };

  const handleAddBranchParam = (branch) => {
    console.log('Adding branch param for:', branch);
    const updatedParams = {
      ...actionFormData.webhookParams,
      [branch]: [
        ...(actionFormData.webhookParams?.[branch] || []),
        { name: '', value: '' }
      ]
    };
    console.log('Updated params:', updatedParams);
    setActionFormData({
      ...actionFormData,
      webhookParams: updatedParams
    });
  };

  const handleUpdateBranchParam = (branch, index, field, value) => {
    console.log('Updating branch param:', { branch, index, field, value });
    const params = [...(actionFormData.webhookParams?.[branch] || [])];
    params[index] = { ...params[index], [field]: value };
    
    const updatedParams = {
      ...actionFormData.webhookParams,
      [branch]: params
    };
    console.log('Updated params:', updatedParams);
    
    setActionFormData({
      ...actionFormData,
      webhookParams: updatedParams
    });
  };

  const handleDeleteBranchParam = (branch, index) => {
    console.log('Deleting branch param:', { branch, index });
    const params = [...(actionFormData.webhookParams?.[branch] || [])];
    params.splice(index, 1);
    
    const updatedParams = {
      ...actionFormData.webhookParams,
      [branch]: params
    };
    console.log('Updated params after delete:', updatedParams);
    
    setActionFormData({
      ...actionFormData,
      webhookParams: updatedParams
    });
  };

  const handleSave = () => {
    console.log('Saving action with data:', actionFormData);
    // Only include non-empty webhook parameters
    const filteredParams = Object.entries(actionFormData.webhookParams || {}).reduce((acc, [branch, params]) => {
      const validParams = params.filter(param => param.name && param.value);
      if (validParams.length > 0) {
        acc[branch] = validParams;
      }
      return acc;
    }, {});
    
    const dataToSave = {
      ...actionFormData,
      webhookParams: Object.keys(filteredParams).length > 0 ? filteredParams : undefined
    };
    console.log('Data to save:', dataToSave);
    onSaveAction(dataToSave);
  };

  return (
    <>
      <TextField
        fullWidth
        label="Action Name"
        value={actionFormData.name || ''}
        onChange={(e) => setActionFormData({ ...actionFormData, name: e.target.value })}
        margin="normal"
        variant="outlined"
        sx={inputStyles}
      />

      <FormControl fullWidth margin="normal">
        <InputLabel sx={{
          color: 'rgba(255, 255, 255, 0.7)',
          '&.Mui-focused': {
            color: '#2196f3',
          },
        }}>Action Type</InputLabel>
        <Select
          value={actionFormData.actionType || ''}
          onChange={(e) => setActionFormData({
            ...actionFormData,
            actionType: e.target.value,
            webhookUrl: '',
            scriptContent: '',
            webhookParams: {}
          })}
          label="Action Type"
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
          <MenuItem value="webhook">Webhook</MenuItem>
          <MenuItem value="script">Bash Script</MenuItem>
        </Select>
      </FormControl>

      {actionFormData.actionType === 'webhook' ? (
        <>
          <TextField
            fullWidth
            label="Webhook URL"
            value={actionFormData.webhookUrl || ''}
            onChange={(e) => setActionFormData({ ...actionFormData, webhookUrl: e.target.value })}
            margin="normal"
            variant="outlined"
            sx={inputStyles}
          />
          
          {/* Branch-specific Parameters */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#fff' }}>
              Branch Parameters
            </Typography>
            {branches?.length > 0 ? branches.map((branch) => (
              <Accordion 
                key={branch}
                sx={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  mb: 1,
                  '&:before': {
                    display: 'none',
                  },
                  '& .MuiAccordionSummary-root': {
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon sx={{ color: '#90caf9' }} />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }
                  }}
                >
                  <GitHubIcon sx={{ fontSize: 20, color: '#90caf9' }} />
                  <Typography sx={{ 
                    color: '#fff',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    Branch: <span style={{ color: '#90caf9' }}>{branch}</span>
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {(actionFormData.webhookParams?.[branch] || []).map((param, index) => (
                    <Box key={index} sx={{ mb: 2, display: 'flex', gap: 2 }}>
                      <TextField
                        size="small"
                        label="Parameter Name"
                        value={param.name}
                        onChange={(e) => handleUpdateBranchParam(branch, index, 'name', e.target.value)}
                        sx={inputStyles}
                      />
                      <TextField
                        size="small"
                        label="Value"
                        value={param.value}
                        onChange={(e) => handleUpdateBranchParam(branch, index, 'value', e.target.value)}
                        sx={inputStyles}
                      />
                      <IconButton 
                        onClick={() => handleDeleteBranchParam(branch, index)}
                        sx={{ 
                          color: '#ff4444',
                          '&:hover': {
                            background: 'rgba(255, 68, 68, 0.1)',
                          }
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => handleAddBranchParam(branch)}
                    sx={{
                      color: '#90caf9',
                      borderColor: 'rgba(144, 202, 249, 0.5)',
                      '&:hover': {
                        borderColor: '#90caf9',
                        background: 'rgba(33, 150, 243, 0.1)',
                      }
                    }}
                  >
                    Add Parameter
                  </Button>
                </AccordionDetails>
              </Accordion>
            )) : (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic' }}>
                No branches configured for this project. Add branches in project settings to configure branch-specific parameters.
              </Typography>
            )}
          </Box>
        </>
      ) : (
        <TextField
          fullWidth
          label="Bash Script"
          value={actionFormData.scriptContent || ''}
          onChange={(e) => setActionFormData({ ...actionFormData, scriptContent: e.target.value })}
          margin="normal"
          variant="outlined"
          multiline
          rows={4}
          sx={{
            ...inputStyles,
            '& .MuiOutlinedInput-root': {
              ...inputStyles['& .MuiOutlinedInput-root'],
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
            },
          }}
        />
      )}

      {/* Secrets Section */}
      {actionFormData.actionType === 'script' && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#fff' }}>
            Environment Variables
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              label="Name"
              value={newSecret.name || ''}
              onChange={(e) => setNewSecret({ ...newSecret, name: e.target.value })}
              size="small"
              sx={inputStyles}
            />
            <TextField
              label="Value"
              value={newSecret.value || ''}
              onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
              size="small"
              sx={inputStyles}
            />
            <Button
              variant="contained"
              onClick={onAddSecret}
              disabled={!newSecret.name || !newSecret.value}
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
              Add
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {secrets.map((secret) => (
              <Chip
                key={secret.id}
                label={secret.name}
                onDelete={() => onDeleteSecret(secret.id)}
                size="small"
                sx={{
                  background: 'rgba(33, 150, 243, 0.1)',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  color: '#90caf9',
                  '& .MuiChip-deleteIcon': {
                    color: '#90caf9',
                    '&:hover': {
                      color: '#ff4444',
                    },
                  },
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      <DialogActions sx={{ mt: 3, px: 0, pb: 0 }}>
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
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!actionFormData.name || (!actionFormData.webhookUrl && !actionFormData.scriptContent)}
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
          {editingAction ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </>
  );
};

export default ActionForm;
