import { AppBar, Toolbar, Typography, Box, IconButton, Button } from '@mui/material';
import { GitHub as GitHubIcon, Refresh as RefreshIcon, Add as AddIcon } from '@mui/icons-material';

const Header = ({ onRefresh, onAddProject }) => {
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
        <Box>
          <IconButton
            sx={{ 
              mr: 2,
              color: '#fff',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)'
              }
            }}
            onClick={onRefresh}
          >
            <RefreshIcon />
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
