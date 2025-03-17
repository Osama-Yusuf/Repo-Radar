import { Box, List, ListItem, ListItemIcon, ListItemText, Paper, Tooltip } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import {
  GitHub as GitHubIcon,
  Memory as MemoryIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';

const navItems = [
  { path: '/', label: 'Repositories', icon: <GitHubIcon /> },
  { path: '/pods', label: 'Pod Status', icon: <MemoryIcon /> },
  { path: '/pipeline-status', label: 'Pipeline Status', icon: <TimelineIcon /> },
];

const SideNav = () => {
  const location = useLocation();

  return (
    <Paper
      sx={{
        width: '80px',
        minHeight: '100vh',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 2,
        position: 'fixed',
        left: 0,
        top: 0,
      }}
    >
      <List>
        {navItems.map(({ path, label, icon }) => (
          <Tooltip key={path} title={label} placement="right" arrow>
            <ListItem
              component={Link}
              to={path}
              sx={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                mb: 1,
                display: 'flex',
                justifyContent: 'center',
                color: location.pathname === path ? '#2196f3' : 'rgba(255, 255, 255, 0.7)',
                background: location.pathname === path ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: location.pathname === path ? '#2196f3' : '#fff',
                }
              }}
            >
              <Box sx={{ transform: 'scale(1.2)' }}>{icon}</Box>
            </ListItem>
          </Tooltip>
        ))}
      </List>
    </Paper>
  );
};

export default SideNav;
