import { Box, Paper, Typography, Link, Chip, Divider, IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { GitHub as GitHubIcon, Settings as SettingsIcon, Edit as EditIcon, Delete as DeleteIcon, Webhook as WebhookIcon, Terminal as TerminalIcon, PlayArrow as PlayArrowIcon, History as HistoryIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { useState } from 'react';
import TriggerActionDialog from '../actions/TriggerActionDialog';

const ProjectCard = ({ project, onOpenLogs, onOpenActionDialog, onEditProject, onDeleteProject, onDeleteAction, onTriggerAction }) => {
  const [openTriggerDialog, setOpenTriggerDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (event) => {
    if (event) {
      event.stopPropagation();
    }
    setAnchorEl(null);
  };

  const handleTriggerAction = (branch) => {
    onTriggerAction(project.id, branch);
  };

  return (
    <>
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
            '& .action-buttons': {
              opacity: 1,
            },
          },
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
          <Box className="action-buttons" sx={{ opacity: 0.3, transition: 'opacity 0.3s ease' }}>
            <Tooltip title="More Actions">
              <IconButton
                size="small"
                onClick={handleClick}
                sx={{
                  color: '#90caf9',
                  '&:hover': {
                    background: 'rgba(33, 150, 243, 0.1)',
                  },
                }}
              >
                <MoreVertIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            '& .MuiMenuItem-root': {
              color: '#fff',
              '&:hover': {
                background: 'rgba(33, 150, 243, 0.1)',
              },
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={(e) => {
          handleClose(e);
          setOpenTriggerDialog(true);
        }}>
          <ListItemIcon>
            <PlayArrowIcon sx={{ color: '#90caf9' }} />
          </ListItemIcon>
          <ListItemText>Trigger Actions</ListItemText>
        </MenuItem>
        <MenuItem onClick={(e) => {
          handleClose(e);
          onOpenActionDialog(project);
        }}>
          <ListItemIcon>
            <SettingsIcon sx={{ color: '#90caf9' }} />
          </ListItemIcon>
          <ListItemText>Manage Actions</ListItemText>
        </MenuItem>
        <MenuItem onClick={(e) => {
          handleClose(e);
          onOpenLogs(project);
        }}>
          <ListItemIcon>
            <HistoryIcon sx={{ color: '#90caf9' }} />
          </ListItemIcon>
          <ListItemText>View Logs</ListItemText>
        </MenuItem>
        <MenuItem onClick={(e) => {
          handleClose(e);
          onEditProject(project);
        }}>
          <ListItemIcon>
            <EditIcon sx={{ color: '#90caf9' }} />
          </ListItemIcon>
          <ListItemText>Edit Project</ListItemText>
        </MenuItem>
        <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
        <MenuItem onClick={(e) => {
          handleClose(e);
          onDeleteProject(project.id);
        }} sx={{ color: '#ff4444 !important' }}>
          <ListItemIcon>
            <DeleteIcon sx={{ color: '#ff4444' }} />
          </ListItemIcon>
          <ListItemText>Delete Project</ListItemText>
        </MenuItem>
      </Menu>

      <TriggerActionDialog
        open={openTriggerDialog}
        onClose={() => setOpenTriggerDialog(false)}
        project={project}
        onTrigger={handleTriggerAction}
      />
    </>
  );
};

export default ProjectCard;
