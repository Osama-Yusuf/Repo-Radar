import React, { useState, useEffect, useContext } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link as MuiLink,
  Alert
} from '@mui/material';
import axios from 'axios';
// import AuthContext from '../contexts/AuthContext'; // Not explicitly needed if auth is cookie-based

// Reconstruct API_BASE_URL and axiosInstance as it's not exported from App.jsx
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

  // Fetch projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      setLoadingProjects(true);
      setError(null);
      try {
        const response = await axiosInstance.get('/projects');
        setProjects(response.data || []); // Ensure projects is always an array
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Please try again later.');
        setProjects([]); // Ensure projects is an array on error
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
      setError(null); // Clear error when no project is selected
      return;
    }

    const fetchFindings = async () => {
      setLoadingFindings(true);
      setError(null); // Clear previous errors
      setFindings([]); // Clear previous findings
      try {
        const response = await axiosInstance.get(`/projects/${selectedProjectId}/secret-findings`);
        setFindings(response.data || []); // Ensure findings is always an array
      } catch (err) {
        console.error(`Error fetching findings for project ${selectedProjectId}:`, err);
        setError(`Failed to load findings for project ${selectedProjectId}.`);
        setFindings([]); // Ensure findings is an array on error
      } finally {
        setLoadingFindings(false);
      }
    };

    fetchFindings();
  }, [selectedProjectId]);

  const handleProjectChange = (event) => {
    setSelectedProjectId(event.target.value);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', mb: 3 }}>
        Secret Detection Findings
      </Typography>

      {loadingProjects ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading projects...</Typography>
        </Box>
      ) : (
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel id="project-select-label">Select Project</InputLabel>
          <Select
            labelId="project-select-label"
            id="project-select"
            value={selectedProjectId}
            label="Select Project"
            onChange={handleProjectChange}
            disabled={projects.length === 0}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name} (ID: {project.id})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}

      {!selectedProjectId && !loadingProjects && (
        <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}>
          Please select a project to view its secret findings.
        </Typography>
      )}

      {selectedProjectId && loadingFindings && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading findings...</Typography>
        </Box>
      )}

      {selectedProjectId && !loadingFindings && !error && findings.length === 0 && (
        <Typography variant="body1" sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}>
          No secret findings detected for this project.
        </Typography>
      )}

      {selectedProjectId && !loadingFindings && !error && findings.length > 0 && (
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: '70vh' }}> {/* Adjust maxHeight as needed */}
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
