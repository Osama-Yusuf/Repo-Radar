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
import { AuthContext } from '../../context/AuthContext'; // Import AuthContext

const baseNavItems = [
  { path: '/', label: 'Repositories', icon: <SourceIcon /> },
  { path: '/pods', label: 'Pod Status', icon: <MemoryIcon /> },
  { path: '/pipeline-status', label: 'Pipeline Status', icon: <AutoModeIcon /> },
  { path: '/vulnerabilities', label: 'Vulnerabilities', icon: <SecurityIcon /> },
];

const SideNav = () => {
  const location = useLocation();
  const { user } = useContext(AuthContext); // Get user from AuthContext

  const navItems = [
    ...baseNavItems,
    ...(user && user.role === 'admin'
      ? [{ path: '/settings', label: 'Settings', icon: <SettingsIcon /> }]
      : []),
  ];

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
