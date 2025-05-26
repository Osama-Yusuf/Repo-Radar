import React, { useState, useEffect, useContext } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link as MuiLink,
  Alert,
  Grid, // Added Grid
  Card, // Added Card
  CardContent, // Added CardContent
  CardActions, // Added CardActions
  Button // Added Button
} from '@mui/material';
import axios from 'axios';
// import AuthContext from '../contexts/AuthContext'; 

// Reconstruct API_BASE_URL and axiosInstance
const PORT = import.meta.env.VITE_PORT || '3001';
const API_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || `http://localhost:${PORT}/api`;

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

const SecretDetectionPage = () => {
  // const { currentUser } = useContext(AuthContext); // If needed for token-based auth in future
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [findings, setFindings] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [error, setError] = useState(null);
  const [selectedProjectName, setSelectedProjectName] = useState('');


  // Fetch projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      setError(null);
      try {
        const response = await axiosInstance.get('/projects');
        setProjects(response.data || []); 
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Please try again later.');
        setProjects([]); 
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  // Fetch findings when selectedProjectId changes
  useEffect(() => {
    if (!selectedProjectId) {
      setFindings([]);
      // Keep project-level error if any, or clear general error if just deselecting
      // setError(null); 
      return;
    }

    const fetchFindingsForProject = async () => {
      setLoadingFindings(true);
      setError(null); 
      setFindings([]); 
      try {
        const response = await axiosInstance.get(`/projects/${selectedProjectId}/secret-findings`);
        setFindings(response.data || []); 
      } catch (err) {
        console.error(`Error fetching findings for project ${selectedProjectId}:`, err);
        setError(`Failed to load findings for project ${selectedProjectName}.`);
        setFindings([]); 
      } finally {
        setLoadingFindings(false);
      }
    };

    fetchFindingsForProject();
  }, [selectedProjectId, selectedProjectName]); // Added selectedProjectName to dependency for error message

  const handleSelectProject = (projectId, projectName) => {
    setSelectedProjectId(projectId);
    setSelectedProjectName(projectName);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', mb: 3 }}>
        Secret Detection Findings
      </Typography>

      {loadingProjects && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading projects...</Typography>
        </Box>
      )}

      {!loadingProjects && projects.length === 0 && !error && (
         <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}>
          No projects found. Add projects to monitor them for secrets.
        </Typography>
      )}
      
      {!loadingProjects && projects.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {projects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  bgcolor: selectedProjectId === project.id ? 'action.selected' : 'background.paper', 
                  border: selectedProjectId === project.id ? '1px solid #2196f3' : '1px solid transparent',
                  boxShadow: selectedProjectId === project.id ? '0 0 12px #2196f3' : 3,
                }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="div">
                    {project.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ID: {project.id}
                  </Typography>
                  <MuiLink href={project.repo_url} target="_blank" rel="noopener noreferrer" variant="body2">
                    {project.repo_url}
                  </MuiLink>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    onClick={() => handleSelectProject(project.id, project.name)}
                    variant={selectedProjectId === project.id ? "contained" : "outlined"}
                  >
                    {selectedProjectId === project.id && loadingFindings ? <CircularProgress size={20} sx={{mr:1}}/> : null}
                    {selectedProjectId === project.id ? 'Selected' : 'View Findings'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}

      {selectedProjectId && loadingFindings && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading findings for {selectedProjectName}...</Typography>
        </Box>
      )}
      
      {selectedProjectId && !loadingFindings && !error && findings.length === 0 && (
         <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}>
          No secret findings detected for project: {selectedProjectName}.
        </Typography>
      )}

      {selectedProjectId && !loadingFindings && !error && findings.length > 0 && (
        <Paper sx={{ width: '100%', overflow: 'hidden', mt: 2 }}>
          <Typography variant="h5" sx={{ p: 2 }}>Findings for: {selectedProjectName}</Typography>
          <TableContainer sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader aria-label="secret findings table">
              <TableHead>
                <TableRow>
                  <TableCell>File Path</TableCell>
                  <TableCell align="right">Line</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Secret</TableCell>
                  <TableCell>Commit Hash</TableCell>
                  <TableCell>Author</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Rule ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {findings.map((finding) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={finding.id}>
                    <TableCell sx={{ wordBreak: 'break-all' }}>{finding.filePath}</TableCell>
                    <TableCell align="right">{finding.lineNumber}</TableCell>
                    <TableCell>{finding.description}</TableCell>
                    <TableCell sx={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {finding.secret}
                    </TableCell>
                    <TableCell>
                      {finding.commitUrl ? (
                        <MuiLink href={finding.commitUrl} target="_blank" rel="noopener noreferrer">
                          {finding.commitHash.substring(0, 12)}...
                        </MuiLink>
                      ) : (
                        finding.commitHash.substring(0, 12) + '...'
                      )}
                    </TableCell>
                    <TableCell>{finding.author}</TableCell>
                    <TableCell>
                      {finding.date ? new Date(finding.date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>{finding.ruleId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
};

export default SecretDetectionPage;
