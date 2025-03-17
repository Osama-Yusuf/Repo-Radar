import { ListItem, ListItemText, IconButton, Typography, Box, Divider, Chip } from '@mui/material';
import { Delete as DeleteIcon, Webhook as WebhookIcon, Code as CodeIcon } from '@mui/icons-material';

const ActionList = ({ actions, onDeleteAction }) => {
  return actions.map((action) => (
    <ListItem
      key={action.id}
      sx={{
        mb: 2,
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        transition: 'all 0.3s ease',
        '&:hover': {
          background: 'rgba(255, 255, 255, 0.08)',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        },
      }}
    >
      <Box sx={{ mr: 2, color: '#90caf9' }}>
        {action.actionType === 'webhook' ? <WebhookIcon /> : <CodeIcon />}
      </Box>
      <ListItemText
        primary={
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff' }}>
            {action.name || 'Unnamed Action'}
          </Typography>
        }
        secondary={
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            {action.actionType === 'webhook'
              ? `Webhook URL: ${action.webhookUrl}`
              : 'Script'}
          </Typography>
        }
      />
      <IconButton
        edge="end"
        onClick={(e) => onDeleteAction(action.id, e)}
        sx={{
          color: '#ff4444',
          opacity: 0.7,
          transition: 'all 0.2s ease',
          '&:hover': {
            opacity: 1,
            background: 'rgba(255, 68, 68, 0.1)',
          },
        }}
      >
        <DeleteIcon />
      </IconButton>
      <Divider sx={{ mt: 2 }} />
    </ListItem>
  ));
};

export default ActionList;
