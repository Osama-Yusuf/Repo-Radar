import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Grid,
  List,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import ActionList from './ActionList';
import ActionForm from './ActionForm';

const ActionDialog = ({
  open,
  onClose,
  selectedProject,
  editingAction,
  actionFormData,
  setActionFormData,
  onSaveAction,
  onDeleteAction,
  secrets,
  newSecret,
  setNewSecret,
  onAddSecret,
  onDeleteSecret,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255, 255, 255, 0.05)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.3)',
            },
          },
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#fff' }}>
            {editingAction ? 'Edit Action' : 'Manage Actions'}
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
      <DialogContent sx={{
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(255, 255, 255, 0.05)',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.3)',
          },
        },
      }}>
        <Grid container spacing={3}>
          {/* Existing Actions */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#fff' }}>
              Current Actions
            </Typography>
            {selectedProject?.actions?.length > 0 ? (
              <List>
                <ActionList
                  actions={selectedProject.actions}
                  onDeleteAction={(actionId, e) => onDeleteAction(actionId, selectedProject.id, e)}
                />
              </List>
            ) : (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                No actions configured yet
              </Typography>
            )}
          </Grid>

          {/* Add New Action */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#fff' }}>
              {editingAction ? 'Edit Action' : 'Add New Action'}
            </Typography>
            <Box sx={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              p: 2
            }}>
              <ActionForm
                actionFormData={actionFormData}
                setActionFormData={setActionFormData}
                editingAction={editingAction}
                onSaveAction={onSaveAction}
                onClose={onClose}
                secrets={secrets}
                newSecret={newSecret}
                setNewSecret={setNewSecret}
                onAddSecret={onAddSecret}
                onDeleteSecret={onDeleteSecret}
                branches={selectedProject?.branches || []}
              />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
};

export default ActionDialog;
