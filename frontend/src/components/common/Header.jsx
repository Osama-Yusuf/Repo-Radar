import { AppBar, Toolbar, Typography, Box, IconButton, Button, CircularProgress, InputBase } from '@mui/material';
import { GitHub as GitHubIcon, Refresh as RefreshIcon, Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';

const Header = ({ onRefresh, onAddProject, isRefreshing, onSearch }) => {
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
            placeholder="Search repositories, branches, webhooks..."
            sx={{
              color: '#fff',
              flex: 1,
              '& input::placeholder': {
                color: 'rgba(255, 255, 255, 0.5)',
                opacity: 1
              }
            }}
            onChange={(e) => onSearch(e.target.value)}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            sx={{ 
              mr: 2,
              color: '#fff',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)'
              },
              position: 'relative'
            }}
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <CircularProgress
                size={24}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  position: 'absolute'
                }}
              />
            ) : (
              <RefreshIcon />
            )}
          </IconButton>
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
                background: 'linear-gradient(45deg, #1976d2 30%, #00a0c2 90%)',
              }
            }}
          >
            Add Project
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
