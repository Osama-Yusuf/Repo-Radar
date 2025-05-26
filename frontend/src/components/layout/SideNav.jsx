import React, { useContext } from 'react'; // Import useContext
import { Box, List, ListItem, ListItemIcon, ListItemText, Paper, Tooltip } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import {
  Source as SourceIcon,
  Memory as MemoryIcon,
  Refresh as RefreshIcon,
  AutoMode as AutoModeIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon // Import SettingsIcon
} from '@mui/icons-material';
import AuthContext from '../../contexts/AuthContext';

const baseNavItems = [
  { path: '/', label: 'Repositories', icon: <SourceIcon /> },
  { path: '/pods', label: 'Pod Status', icon: <MemoryIcon /> },
  { path: '/pipeline-status', label: 'Pipeline Status', icon: <AutoModeIcon /> },
  { path: '/vulnerabilities', label: 'Vulnerabilities', icon: <SecurityIcon /> },
];

const SideNav = () => {
  const location = useLocation();
  const { currentUser } = useContext(AuthContext); // Get currentUser from AuthContext

  // Create a separate settings item
  const settingsItem = currentUser && currentUser.role === 'admin'
    ? { path: '/settings', label: 'Settings', icon: <SettingsIcon /> }
    : null;

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
      {/* Main navigation items at the top */}
      <List sx={{ flexGrow: 0 }}>
        {baseNavItems.map(({ path, label, icon }) => (
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

      {/* Spacer to push settings to bottom */}
      <Box sx={{ flexGrow: 1 }} />

      {/* Settings button fixed at the bottom */}
      {settingsItem && (
        <Box sx={{ mb: 3 }}>
          <Tooltip title={settingsItem.label} placement="right" arrow>
            <ListItem
              component={Link}
              to={settingsItem.path}
              sx={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'center',
                color: location.pathname === settingsItem.path ? '#2196f3' : 'rgba(255, 255, 255, 0.7)',
                background: location.pathname === settingsItem.path ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: location.pathname === settingsItem.path ? '#2196f3' : '#fff',
                }
              }}
            >
              <Box sx={{ transform: 'scale(1.2)' }}>{settingsItem.icon}</Box>
            </ListItem>
          </Tooltip>
        </Box>
      )}
    </Paper>
  );
};

export default SideNav;
