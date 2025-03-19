import { useState, useEffect } from 'react';
import { Container, Grid, Typography, CircularProgress, Box, Button } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Components
import Header from './components/common/Header';
import SideNav from './components/layout/SideNav';
import ProjectCard from './components/projects/ProjectCard';
import ProjectDialog from './components/projects/ProjectDialog';
import ActionDialog from './components/actions/ActionDialog';
import LogsDialog from './components/logs/LogsDialog';

// Pages
import PodStatus from './pages/PodStatus';
import PipelineStatus from './pages/PipelineStatus';

// Context
import { SearchProvider, useSearch } from './contexts/SearchContext';

const PORT = import.meta.env.VITE_PORT || '3001';
const API_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || `http://localhost:${PORT}/api`;

console.log(`API_BASE_URL: ${API_BASE_URL}`);

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

function RepositoriesPage({
  projects,
  loading,
  error,
  handleOpenLogs,
  handleOpenActionDialog,
  handleOpenDialog,
  handleDelete,
  handleDeleteAction,
  handleTriggerAction,
  sortConfig,
  handleSort,
  sortProjects
}) {
  const { searchQuery } = useSearch();

  const filteredAndSortedProjects = sortProjects(
    (projects || []).filter(project => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (project?.name?.toLowerCase() || '').includes(query) ||
        (project?.repo_url?.toLowerCase() || '').includes(query) ||
        (Array.isArray(project?.branches) ? project.branches.join(', ').toLowerCase() : '').includes(query)
      );
    })
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#fff' }}>
          Monitored Repositories
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {[
            { label: 'Name', field: 'name' },
            { label: 'Branches', field: 'branches' },
            { label: 'Actions', field: 'actions' },
            { label: 'Last Updated', field: 'updated' }
          ].map(({ label, field }) => (
            <Button
              key={field}
              size="small"
              onClick={() => handleSort(field)}
              sx={{
                color: sortConfig.field === field ? '#2196f3' : 'rgba(255, 255, 255, 0.7)',
                minWidth: 'auto',
                px: 2,
                '&:hover': {
                  color: '#2196f3'
                }
              }}
              endIcon={sortConfig.field === field ? (
                <Typography component="span" sx={{ fontSize: '0.8rem', ml: 0.5 }}>
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </Typography>
              ) : null}
            >
              {label}
            </Button>
          ))}
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Grid container spacing={3}>
          {filteredAndSortedProjects.length === 0 ? (
            <Grid item xs={12} sx={{ textAlign: 'center', mt: 8 }}>
              <Typography variant="h5" sx={{ color: '#8b8da0', mb: 2 }}>
                {searchQuery ? 'No matching repositories found' : 'No repositories monitored yet'}
              </Typography>
              <Typography variant="body1" sx={{ color: '#6b6d7c', mb: 4 }}>
                {searchQuery ?
                  'Try adjusting your search query' :
                  'Click the "Add Project" button above to start monitoring your first repository'
                }
              </Typography>
              {!searchQuery && (
                <div style={{
                  width: '60px',
                  height: '60px',
                  margin: '0 auto',
                  border: '3px dashed #2d325a',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Typography variant="h4" sx={{ color: '#2d325a' }}>+</Typography>
                </div>
              )}
            </Grid>
          ) : (
            filteredAndSortedProjects.map((project) => (
              <Grid item xs={12} key={project.id}>
                <ProjectCard
                  project={project}
                  onOpenLogs={handleOpenLogs}
                  onOpenActionDialog={handleOpenActionDialog}
                  onEditProject={handleOpenDialog}
                  onDeleteProject={handleDelete}
                  onDeleteAction={handleDeleteAction}
                  onTriggerAction={handleTriggerAction}
                />
              </Grid>
            ))
          )}
        </Grid>
      )}
    </Container>
  );
}

function App() {
  // Project State
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    repoUrl: '',
    branches: '',
    checkInterval: 5,
  });
  const [sortConfig, setSortConfig] = useState({ field: 'name', direction: 'asc' });

  // Action State
  const [openActionDialog, setOpenActionDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingAction, setEditingAction] = useState(null);
  const [actionFormData, setActionFormData] = useState({
    name: '',
    actionType: 'webhook',
    webhookUrl: '',
    scriptContent: '',
    webhookParams: {}
  });
  const [secrets, setSecrets] = useState([]);
  const [newSecret, setNewSecret] = useState({ name: '', value: '' });

  // Logs State
  const [openLogsDialog, setOpenLogsDialog] = useState(false);
  const [projectLogs, setProjectLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchProjects = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      const response = await axiosInstance.get('/projects');
      setProjects(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(() => fetchProjects(), 30000);
    return () => clearInterval(interval);
  }, []);

  // Sort Functions
  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortProjects = (projects) => {
    if (!Array.isArray(projects)) return [];

    return [...projects].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      switch (sortConfig.field) {
        case 'name':
          return direction * ((a?.name || '').localeCompare(b?.name || ''));
        case 'branches':
          const aBranches = Array.isArray(a?.branches) ? a.branches.length : 0;
          const bBranches = Array.isArray(b?.branches) ? b.branches.length : 0;
          return direction * (aBranches - bBranches);
        case 'actions':
          const aActions = Array.isArray(a?.actions) ? a.actions.length : 0;
          const bActions = Array.isArray(b?.actions) ? b.actions.length : 0;
          return direction * (aActions - bActions);
        case 'updated':
          const aDate = a?.updated_at ? new Date(a.updated_at) : new Date(0);
          const bDate = b?.updated_at ? new Date(b.updated_at) : new Date(0);
          return direction * (bDate - aDate);
        default:
          return 0;
      }
    });
  };

  // Project Handlers
  const handleOpenDialog = (project = null) => {
    if (project) {
      setFormData({
        name: project.name,
        repoUrl: project.repo_url,
        branches: project.branches.join(','),
        checkInterval: project.check_interval,
      });
      setEditingProject(project);
    } else {
      setFormData({
        name: '',
        repoUrl: '',
        branches: '',
        checkInterval: 5,
      });
      setEditingProject(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProject(null);
  };

  const handleSubmit = async () => {
    try {
      const projectData = {
        name: formData.name,
        repoUrl: formData.repoUrl,
        branches: formData.branches.split(',').map((b) => b.trim()).filter((b) => b),
        checkInterval: parseInt(formData.checkInterval),
      };

      if (editingProject) {
        await axiosInstance.put(`/projects/${editingProject.id}`, projectData);
      } else {
        await axiosInstance.post('/projects', projectData);
      }

      handleCloseDialog();
      fetchProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/projects/${id}`);
      fetchProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  // Action Handlers
  const handleOpenActionDialog = (project, action = null) => {
    const projectBranches = project.branches || [];
    setSelectedProject({
      ...project,
      branches: projectBranches
    });

    if (action) {
      console.log('Editing action:', action);
      setEditingAction(action);

      // Initialize webhook parameters from existing action
      const webhookParams = {};
      projectBranches.forEach(branch => {
        webhookParams[branch] = action.webhookParams
          ?.filter(param => param.branch === branch)
          .map(param => ({ name: param.name, value: param.value })) || [];
      });

      console.log('Initialized webhook params:', webhookParams);

      setActionFormData({
        name: action.name || '',
        actionType: action.actionType,
        webhookUrl: action.webhookUrl || '',
        scriptContent: action.scriptContent || '',
        webhookParams
      });

      loadSecrets(action.id);
    } else {
      console.log('Creating new action');
      setEditingAction(null);

      // Initialize empty webhook parameters for each branch
      const webhookParams = {};
      projectBranches.forEach(branch => {
        webhookParams[branch] = [];
      });

      console.log('Initialized empty webhook params:', webhookParams);

      setActionFormData({
        name: '',
        actionType: 'webhook',
        webhookUrl: '',
        scriptContent: '',
        webhookParams
      });
      setSecrets([]);
    }
    setOpenActionDialog(true);
  };

  const handleCloseActionDialog = () => {
    setOpenActionDialog(false);
    setEditingAction(null);
    setSelectedProject(null);
    setActionFormData({
      name: '',
      actionType: 'webhook',
      webhookUrl: '',
      scriptContent: '',
      webhookParams: {}
    });
    setSecrets([]);
    setNewSecret({ name: '', value: '' });
  };

  const handleSaveAction = async () => {
    try {
      console.log('Starting to save action...');
      console.log('Action Form Data:', JSON.stringify(actionFormData, null, 2));

      // Convert webhook parameters to array format for backend
      const webhookParamsArray = [];
      if (actionFormData.webhookParams) {
        Object.entries(actionFormData.webhookParams).forEach(([branch, params]) => {
          params.forEach(param => {
            if (param.name && param.value) {
              webhookParamsArray.push({
                branch,
                name: param.name,
                value: param.value
              });
            }
          });
        });
      }

      console.log('Webhook Params Array:', webhookParamsArray);

      const actionData = {
        name: actionFormData.name,
        actionType: actionFormData.actionType,
        webhookUrl: actionFormData.webhookUrl || null,
        scriptContent: actionFormData.scriptContent || null,
        webhookParams: webhookParamsArray.length > 0 ? webhookParamsArray : undefined
      };

      console.log('Action Data to Send:', JSON.stringify(actionData, null, 2));
      console.log('Selected Project:', selectedProject);
      console.log('Editing Action:', editingAction);

      let response;
      const url = editingAction
        ? `/projects/${selectedProject.id}/actions/${editingAction.id}`
        : `/projects/${selectedProject.id}/actions`;

      console.log('Request URL:', url);
      console.log('Request Method:', editingAction ? 'PUT' : 'POST');

      if (editingAction) {
        response = await axiosInstance.put(url, actionData);
      } else {
        response = await axiosInstance.post(url, actionData);
      }

      console.log('Response from server:', response.data);

      await fetchProjects();
      handleCloseActionDialog();
    } catch (err) {
      console.error('Error saving action:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers
      });
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteAction = async (actionId, projectId, e) => {
    e.stopPropagation();
    try {
      await axiosInstance.delete(`/projects/${projectId}/actions/${actionId}`);
      await fetchProjects();
      if (selectedProject) {
        const updatedProject = await axiosInstance.get(`/projects/${projectId}`);
        setSelectedProject(updatedProject.data);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Secrets Handlers
  const loadSecrets = async (actionId) => {
    if (!actionId) return;
    try {
      const response = await axiosInstance.get(`/actions/${actionId}/secrets`);
      setSecrets(response.data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddSecret = async () => {
    try {
      await axiosInstance.post(`/actions/${editingAction.id}/secrets`, newSecret);
      setNewSecret({ name: '', value: '' });
      loadSecrets(editingAction.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSecret = async (secretId) => {
    try {
      await axiosInstance.delete(`/actions/${editingAction.id}/secrets/${secretId}`);
      loadSecrets(editingAction.id);
    } catch (err) {
      setError(err.message);
    }
  };

  // Logs Handlers
  const handleOpenLogs = async (project) => {
    setSelectedProject(project);
    setOpenLogsDialog(true);
    setLoadingLogs(true);
    try {
      const response = await axiosInstance.get(`/projects/${project.id}/logs`);
      setProjectLogs(response.data);
    } catch (err) {
      setError(err.message);
    }
    setLoadingLogs(false);
  };

  const handleTriggerAction = async (projectId, branch) => {
    try {
      const response = await axiosInstance.post(`/projects/${projectId}/trigger`, { branch });

      // Handle different success scenarios
      if (response.data.message) {
        console.log(response.data.message);
        console.log(response.data.results);

        // Show detailed error messages for failed actions
        response.data.results?.failed?.forEach(failure => {
          console.error(`Action ${failure.actionId}: ${failure.error}`);
        });
      }
    } catch (err) {
      // Handle error responses
      if (err.response?.data?.details) {
        // Show the main error message
        console.error(err.response.data.error);

        // Show individual action failures
        err.response.data.details.forEach(detail => {
          console.error(`Action ${detail.actionId}: ${detail.error}`);
        });
      } else {
        console.error(err.response?.data?.error || 'Failed to trigger actions');
      }
    }
  };

  return (
    <SearchProvider>
      <Router>
        <div className="App" style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: '#fff',
          display: 'flex'
        }}>
          <SideNav />
          <Box sx={{ flex: 1, ml: '80px' }}>
            <Header
              onRefresh={() => fetchProjects(true)}
              onAddProject={() => handleOpenDialog()}
              isRefreshing={refreshing}
            />

            <Routes>
              <Route
                path="/"
                element={
                  <RepositoriesPage
                    projects={projects}
                    loading={loading}
                    error={error}
                    handleOpenLogs={handleOpenLogs}
                    handleOpenActionDialog={handleOpenActionDialog}
                    handleOpenDialog={handleOpenDialog}
                    handleDelete={handleDelete}
                    handleDeleteAction={handleDeleteAction}
                    handleTriggerAction={handleTriggerAction}
                    sortConfig={sortConfig}
                    handleSort={handleSort}
                    sortProjects={sortProjects}
                  />
                }
              />
              <Route path="/pods" element={<PodStatus />} />
              <Route path="/pipeline-status" element={<PipelineStatus />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <ProjectDialog
              open={openDialog}
              onClose={handleCloseDialog}
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              editingProject={editingProject}
            />

            <ActionDialog
              open={openActionDialog}
              onClose={handleCloseActionDialog}
              selectedProject={selectedProject}
              editingAction={editingAction}
              actionFormData={actionFormData}
              setActionFormData={setActionFormData}
              onSaveAction={handleSaveAction}
              onDeleteAction={handleDeleteAction}
              secrets={secrets}
              newSecret={newSecret}
              setNewSecret={setNewSecret}
              onAddSecret={handleAddSecret}
              onDeleteSecret={handleDeleteSecret}
            />

            <LogsDialog
              open={openLogsDialog}
              onClose={() => setOpenLogsDialog(false)}
              selectedProject={selectedProject}
              loadingLogs={loadingLogs}
              projectLogs={projectLogs}
            />
          </Box>
        </div>
      </Router>
    </SearchProvider>
  );
}

export default App;
