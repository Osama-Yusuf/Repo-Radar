import { useState, useEffect } from 'react';
import { Container, Grid, Typography, CircularProgress } from '@mui/material';
import axios from 'axios';
import './App.css';

// Components
import Header from './components/common/Header';
import ProjectCard from './components/projects/ProjectCard';
import ProjectDialog from './components/projects/ProjectDialog';
import ActionDialog from './components/actions/ActionDialog';
import LogsDialog from './components/logs/LogsDialog';

const PORT = import.meta.env.VITE_PORT || '3001';
const API_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || `http://localhost:${PORT}/api`;

console.log(`API_BASE_URL: ${API_BASE_URL}`);

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

function App() {
  // Project State
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    repoUrl: '',
    branches: '',
    checkInterval: 5,
  });

  // Action State
  const [openActionDialog, setOpenActionDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [editingAction, setEditingAction] = useState(null);
  const [actionFormData, setActionFormData] = useState({
    name: '',
    actionType: 'webhook',
    webhookUrl: '',
    scriptContent: ''
  });
  const [secrets, setSecrets] = useState([]);
  const [newSecret, setNewSecret] = useState({ name: '', value: '' });

  // Logs State
  const [openLogsDialog, setOpenLogsDialog] = useState(false);
  const [projectLogs, setProjectLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchProjects = async () => {
    try {
      const response = await axiosInstance.get('/projects');
      setProjects(response.data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, 30000);
    return () => clearInterval(interval);
  }, []);

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
    setSelectedProject(project);
    if (action) {
      setEditingAction(action);
      setActionFormData({
        name: action.name || '',
        actionType: action.actionType,
        webhookUrl: action.webhookUrl || '',
        scriptContent: action.scriptContent || ''
      });
      loadSecrets(action.id);
    } else {
      setEditingAction(null);
      setActionFormData({
        name: '',
        actionType: 'webhook',
        webhookUrl: '',
        scriptContent: ''
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
      scriptContent: ''
    });
    setSecrets([]);
    setNewSecret({ name: '', value: '' });
  };

  const handleSaveAction = async () => {
    try {
      const actionData = {
        name: actionFormData.name,
        actionType: actionFormData.actionType,
        webhookUrl: actionFormData.webhookUrl || null,
        scriptContent: actionFormData.scriptContent || null,
      };

      if (editingAction) {
        await axiosInstance.put(`/projects/${selectedProject.id}/actions/${editingAction.id}`, actionData);
      } else {
        await axiosInstance.post(`/projects/${selectedProject.id}/actions`, actionData);
      }

      await fetchProjects();
      handleCloseActionDialog();
    } catch (err) {
      console.error('Error saving action:', err);
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
    <div className="App" style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: '#fff'
    }}>
      <Header onRefresh={fetchProjects} onAddProject={() => handleOpenDialog()} />

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#fff' }}>
          Monitored Repositories
        </Typography>

        {loading ? (
          <Typography>Loading projects...</Typography>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Grid container spacing={3}>
            {projects.map((project) => (
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
            ))}
          </Grid>
        )}
      </Container>

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
    </div>
  );
}

export default App;
