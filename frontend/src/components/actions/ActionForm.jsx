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
  DialogActions
} from '@mui/material';

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
  onDeleteSecret
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

  return (
    <>
      <TextField
        fullWidth
        label="Action Name"
        value={actionFormData.name}
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
          value={actionFormData.actionType}
          onChange={(e) => setActionFormData({
            ...actionFormData,
            actionType: e.target.value,
            webhookUrl: '',
            scriptContent: ''
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
        <TextField
          fullWidth
          label="Webhook URL"
          value={actionFormData.webhookUrl}
          onChange={(e) => setActionFormData({ ...actionFormData, webhookUrl: e.target.value })}
          margin="normal"
          variant="outlined"
          sx={inputStyles}
        />
      ) : (
        <TextField
          fullWidth
          label="Bash Script"
          value={actionFormData.scriptContent}
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
              value={newSecret.name}
              onChange={(e) => setNewSecret({ ...newSecret, name: e.target.value })}
              size="small"
              sx={inputStyles}
            />
            <TextField
              label="Value"
              value={newSecret.value}
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
          variant="outlined"
        >
          Cancel
        </Button>
        <Button
          onClick={onSaveAction}
          variant="contained"
          disabled={
            !actionFormData.name ||
            (actionFormData.actionType === 'webhook' && !actionFormData.webhookUrl) ||
            (actionFormData.actionType === 'script' && !actionFormData.scriptContent)
          }
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
          {editingAction ? 'Save Changes' : 'Add Action'}
        </Button>
      </DialogActions>
    </>
  );
};

export default ActionForm;
