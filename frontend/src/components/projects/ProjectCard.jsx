import { Box, Paper, Typography, Link, Chip, Divider, IconButton } from '@mui/material';
import { GitHub as GitHubIcon, Settings as SettingsIcon, Edit as EditIcon, Delete as DeleteIcon, Webhook as WebhookIcon, Terminal as TerminalIcon } from '@mui/icons-material';

const ProjectCard = ({ project, onOpenLogs, onOpenActionDialog, onEditProject, onDeleteProject, onDeleteAction }) => {
  return (
    <Paper
      elevation={0}
      className="project-card"
      sx={{
        p: 3,
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
          background: 'rgba(255, 255, 255, 0.08)',
        }
      }}
      onClick={() => onOpenLogs(project)}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <GitHubIcon sx={{ fontSize: 24, mr: 2, color: '#2196f3' }} />
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>
              {project.name}
            </Typography>
            <Link
              href={project.repo_url}
              target="_blank"
              rel="noopener"
              className="repo-url"
              onClick={(e) => e.stopPropagation()}
              sx={{ 
                color: '#90caf9',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline'
                }
              }}
            >
              {project.repo_url}
            </Link>
            <Box sx={{ mt: 2 }}>
              {project.branches && (
                <Chip
                  label={`Branches: ${project.branches.join(', ')}`}
                  size="small"
                  sx={{
                    mr: 1,
                    background: 'rgba(33, 150, 243, 0.1)',
                    border: '1px solid rgba(33, 150, 243, 0.3)',
                    color: '#90caf9',
                    '& .MuiChip-label': {
                      fontWeight: 500
                    }
                  }}
                />
              )}
              <Chip
                label={`Check interval: ${project.check_interval}min`}
                size="small"
                sx={{
                  background: 'rgba(33, 150, 243, 0.1)',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  color: '#90caf9',
                  '& .MuiChip-label': {
                    fontWeight: 500
                  }
                }}
              />
            </Box>

            {project.actions && project.actions.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                <Typography variant="subtitle2" sx={{ mb: 1, color: '#fff', fontWeight: 500 }}>
                  Actions
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {project.actions.map((action) => (
                    <Chip
                      key={action.id}
                      label={action.name || 'Unnamed Action'}
                      size="small"
                      icon={action.actionType === 'webhook' ? <WebhookIcon /> : <TerminalIcon />}
                      onDelete={(e) => {
                        e.stopPropagation();
                        onDeleteAction(action.id, project.id, e);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenActionDialog(project, action);
                      }}
                      sx={{
                        background: action.actionType === 'webhook' 
                          ? 'rgba(33, 150, 243, 0.1)'
                          : 'rgba(76, 175, 80, 0.1)',
                        border: action.actionType === 'webhook'
                          ? '1px solid rgba(33, 150, 243, 0.3)'
                          : '1px solid rgba(76, 175, 80, 0.3)',
                        color: action.actionType === 'webhook' ? '#90caf9' : '#a5d6a7',
                        '& .MuiChip-icon': {
                          color: action.actionType === 'webhook' ? '#90caf9' : '#a5d6a7'
                        },
                        '& .MuiChip-deleteIcon': {
                          color: action.actionType === 'webhook' ? '#90caf9' : '#a5d6a7',
                          '&:hover': {
                            color: '#ff4444'
                          }
                        },
                        '&:hover': {
                          background: action.actionType === 'webhook'
                            ? 'rgba(33, 150, 243, 0.2)'
                            : 'rgba(76, 175, 80, 0.2)',
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
        <Box className="action-buttons">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onOpenActionDialog(project);
            }}
            sx={{
              mr: 1,
              color: '#90caf9',
              '&:hover': {
                background: 'rgba(33, 150, 243, 0.1)'
              }
            }}
          >
            <SettingsIcon />
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onEditProject(project);
            }}
            sx={{
              mr: 1,
              color: '#90caf9',
              '&:hover': {
                background: 'rgba(33, 150, 243, 0.1)'
              }
            }}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onDeleteProject(project.id);
            }}
            sx={{
              color: '#ff4444',
              '&:hover': {
                background: 'rgba(244, 67, 54, 0.1)'
              }
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

export default ProjectCard;
