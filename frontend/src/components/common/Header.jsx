import { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Button, InputBase, Tooltip, Menu, MenuItem, Avatar } from '@mui/material';
import { GitHub as GitHubIcon, Add as AddIcon, Search as SearchIcon, FileUpload as ImportIcon, FileDownload as ExportIcon, AccountCircle } from '@mui/icons-material';
import { useSearch } from '../../contexts/SearchContext';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const PORT = import.meta.env.VITE_PORT || '3001';
const API_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || `http://localhost:${PORT}/api`;

const Header = ({ onRefresh, onAddProject, isRefreshing }) => {
  const { handleSearch } = useSearch();
  const { currentUser, logout } = useAuth();
  const [importInput, setImportInput] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/export/all`);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'repo-radar-projects.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting projects:', error);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const projects = JSON.parse(e.target.result);
        await axios.post(`${API_BASE_URL}/projects/import`, projects);
        onRefresh();
      } catch (error) {
        console.error('Error importing projects:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = null; // Reset input
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  return (
    <AppBar
      position="static"
      sx={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <GitHubIcon sx={{ fontSize: 32, mr: 2, color: '#fff' }} />
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#fff', letterSpacing: '0.5px' }}>
            Repo Radar
          </Typography>
        </Box>

        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '4px 12px',
          marginRight: 2,
          flex: 1,
          maxWidth: '400px'
        }}>
          <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.7)', mr: 1 }} />
          <InputBase
            placeholder="Search repositories, pods, pipelines, commit..."
            sx={{
              color: '#fff',
              flex: 1,
              '& input::placeholder': {
                color: 'rgba(255, 255, 255, 0.5)',
                opacity: 1
              }
            }}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <input
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
            ref={input => setImportInput(input)}
          />

          {/* Only show import/export buttons for admin users */}
          {currentUser && currentUser.role === 'admin' && (
            <>
              <Tooltip title="Import Projects">
                <IconButton
                  onClick={() => importInput?.click()}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  <ExportIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Export Projects">
                <IconButton
                  onClick={handleExport}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  <ImportIcon />
                </IconButton>
              </Tooltip>
            </>
          )}

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onAddProject}
            sx={{
              background: 'linear-gradient(45deg, #2196f3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
              color: 'white',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(45deg, #1976d2 30%, #00a0c2 90%)'
              }
            }}
          >
            Add Project
          </Button>

          {currentUser && (
            <>
              <Tooltip title="Account">
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{
                    ml: 1,
                    color: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': { color: '#fff' }
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: '#2196f3',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {currentUser.username.charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    backgroundColor: '#1E213A',
                    color: '#fff',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                    border: '1px solid #2D325A',
                    mt: 1
                  }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem sx={{
                  fontSize: '0.9rem',
                  py: 1,
                  '&:hover': { backgroundColor: 'rgba(33, 150, 243, 0.1)' }
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Signed in as <strong>{currentUser.username}</strong>
                  </Typography>
                </MenuItem>
                <MenuItem
                  onClick={handleLogout}
                  sx={{
                    fontSize: '0.9rem',
                    py: 1,
                    '&:hover': { backgroundColor: 'rgba(33, 150, 243, 0.1)' }
                  }}
                >
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
