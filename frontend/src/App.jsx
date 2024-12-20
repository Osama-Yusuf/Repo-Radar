import { useState, useEffect } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Card,
  CardContent,
  Grid,
  Button,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Link,
  CircularProgress,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material'
import {
  Timeline,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
} from '@mui/lab'
import {
  GitHub as GitHubIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Commit as CommitIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
  Webhook as WebhookIcon,
  Terminal as TerminalIcon,
} from '@mui/icons-material'
import axios from 'axios'
import './App.css'

const PORT = process.env.PORT || '3001';

const API_BASE_URL = process.env.BACKEND_BASE_URL || `http://repo-radar-backend-service.default.svc.cluster.local:3001/api`;

console.log(`API_BASE_URL: ${API_BASE_URL}`);


function App() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [openLogsDialog, setOpenLogsDialog] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectLogs, setProjectLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    repoUrl: '',
    branches: '',
    checkInterval: 5
  })

  // New state for actions and secrets
  const [openActionDialog, setOpenActionDialog] = useState(false)
  const [editingAction, setEditingAction] = useState(null)
  const [actionFormData, setActionFormData] = useState({
    name: '',
    action_type: 'webhook', // 'webhook' or 'script'
    webhook_url: '',
    script_content: ''
  })
  const [secrets, setSecrets] = useState([])
  const [newSecret, setNewSecret] = useState({ name: '', value: '' })

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/projects`)
      setProjects(response.data)
      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
    const interval = setInterval(fetchProjects, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleOpenDialog = (project = null) => {
    if (project) {
      setFormData({
        name: project.name,
        repoUrl: project.repo_url,
        branches: project.branches.join(','),
        checkInterval: project.check_interval
      })
      setEditingProject(project)
    } else {
      setFormData({
        name: '',
        repoUrl: '',
        branches: '',
        checkInterval: 5
      })
      setEditingProject(null)
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingProject(null)
  }

  const handleSubmit = async () => {
    try {
      const projectData = {
        name: formData.name,
        repoUrl: formData.repoUrl,
        branches: formData.branches.split(',').map(b => b.trim()).filter(b => b),
        checkInterval: parseInt(formData.checkInterval)
      }

      if (editingProject) {
        await axios.put(`${API_BASE_URL}/projects/${editingProject.id}`, projectData)
      } else {
        await axios.post(`${API_BASE_URL}/projects`, projectData)
      }

      handleCloseDialog()
      fetchProjects()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/projects/${id}`)
      fetchProjects()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleOpenLogs = async (project) => {
    setSelectedProject(project)
    setOpenLogsDialog(true)
    setLoadingLogs(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/projects/${project.id}/logs`)
      setProjectLogs(response.data)
    } catch (err) {
      setError(err.message)
    }
    setLoadingLogs(false)
  }

  const getStatusColor = (status) => {
    if (status === 'changed') return '#4caf50'
    if (status === 'no_change') return '#9e9e9e'
    if (status?.startsWith('error')) return '#f44336'
    return '#2196f3'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  const handleOpenActionDialog = (project, action = null) => {
    setSelectedProject(project)
    if (action) {
      setEditingAction(action)
      setActionFormData({
        name: action.name || '',
        action_type: action.action_type,
        webhook_url: action.webhook_url || '',
        script_content: action.script_content || ''
      })
      loadSecrets(action.id)
    } else {
      setEditingAction(null)
      setActionFormData({
        name: '',
        action_type: 'webhook',
        webhook_url: '',
        script_content: ''
      })
      setSecrets([])
    }
    setOpenActionDialog(true)
  }

  const handleCloseActionDialog = () => {
    setOpenActionDialog(false)
    setEditingAction(null)
    setSelectedProject(null)
    setActionFormData({
      name: '',
      action_type: 'webhook',
      webhook_url: '',
      script_content: ''
    })
    setSecrets([])
    setNewSecret({ name: '', value: '' })
  }

  const handleSaveAction = async () => {
    try {
      const actionData = {
        name: actionFormData.name,
        actionType: actionFormData.action_type,
        webhookUrl: actionFormData.webhook_url || null,
        scriptContent: actionFormData.script_content || null
      }

      if (editingAction) {
        await axios.put(`${API_BASE_URL}/projects/${selectedProject.id}/actions/${editingAction.id}`, actionData)
      } else {
        await axios.post(`${API_BASE_URL}/projects/${selectedProject.id}/actions`, actionData)
      }

      await fetchProjects()
      handleCloseActionDialog()
    } catch (err) {
      console.error('Error saving action:', err)
      setError(err.response?.data?.error || err.message)
    }
  }

  const handleDeleteAction = async (actionId, projectId, e) => {
    e.stopPropagation()
    try {
      await axios.delete(`${API_BASE_URL}/projects/${projectId}/actions/${actionId}`)
      await fetchProjects() // Fetch all projects
      // Update the selected project in the dialog
      if (selectedProject) {
        const updatedProject = await axios.get(`${API_BASE_URL}/projects/${projectId}`)
        setSelectedProject(updatedProject.data)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const loadSecrets = async (actionId) => {
    if (!actionId) return
    try {
      const response = await axios.get(`${API_BASE_URL}/actions/${actionId}/secrets`)
      setSecrets(response.data)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddSecret = async () => {
    try {
      await axios.post(`${API_BASE_URL}/actions/${editingAction.id}/secrets`, newSecret)
      setNewSecret({ name: '', value: '' })
      loadSecrets(editingAction.id)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteSecret = async (secretId) => {
    try {
      await axios.delete(`${API_BASE_URL}/actions/${editingAction.id}/secrets/${secretId}`)
      loadSecrets(editingAction.id)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      <AppBar position="static" sx={{ bgcolor: '#2196f3' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <GitHubIcon sx={{ fontSize: 32, mr: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 500 }}>
              Repo Radar
            </Typography>
          </Box>
          <Box>
            <IconButton
              color="inherit"
              onClick={fetchProjects}
              sx={{ mr: 1 }}
            >
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{
                bgcolor: 'white',
                color: '#2196f3',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)'
                }
              }}
            >
              Add Project
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 500 }}>
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
                <Paper
                  elevation={1}
                  className="project-card"
                  sx={{ p: 3 }}
                  onClick={() => handleOpenLogs(project)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <GitHubIcon sx={{ fontSize: 24, mr: 2, color: '#666' }} />
                      <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="h6" sx={{ fontWeight: 500 }}>
                          {project.name}
                        </Typography>
                        <Link
                          href={project.repo_url}
                          target="_blank"
                          rel="noopener"
                          className="repo-url"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {project.repo_url}
                        </Link>
                        <Box sx={{ mt: 1 }}>
                          {project.branches && (
                            <Chip
                              label={`Branches: ${project.branches.join(', ')}`}
                              size="small"
                              className="interval-chip"
                            />
                          )}
                          <Chip
                            label={`Check interval: ${project.check_interval}min`}
                            size="small"
                            className="interval-chip"
                          />
                        </Box>

                        {/* Actions Section */}
                        {project.actions && project.actions.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              Actions
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {project.actions.map((action) => (
                                <Chip
                                  key={action.id}
                                  label={action.name || 'Unnamed Action'}
                                  size="small"
                                  icon={action.action_type === 'webhook' ? <WebhookIcon /> : <TerminalIcon />}
                                  onDelete={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAction(action.id, project.id, e);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenActionDialog(project, action)
                                  }}
                                  sx={{
                                    '& .MuiChip-icon': {
                                      color: action.action_type === 'webhook' ? '#2196f3' : '#4caf50'
                                    }
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Box>
                    <Box className="action-buttons">
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenActionDialog(project)
                        }}
                        sx={{ mr: 1 }}
                      >
                        <SettingsIcon />
                      </IconButton>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDialog(project)
                        }}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(project.id)
                        }}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 500 }}>
            {editingProject ? 'Edit Project' : 'Add New Project'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Project Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Repository URL"
              value={formData.repoUrl}
              onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
              margin="normal"
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Branches (comma-separated)"
              value={formData.branches}
              onChange={(e) => setFormData({ ...formData, branches: e.target.value })}
              margin="normal"
              placeholder="main,develop,feature/*"
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Check Interval (minutes)"
              type="number"
              value={formData.checkInterval}
              onChange={(e) => setFormData({ ...formData, checkInterval: e.target.value })}
              margin="normal"
              inputProps={{ min: 1 }}
              variant="outlined"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleCloseDialog}
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disableElevation
          >
            {editingProject ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openLogsDialog}
        onClose={() => setOpenLogsDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            minHeight: '70vh'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5" sx={{ fontWeight: 500 }}>
              {selectedProject?.name} - Activity Log
            </Typography>
            <IconButton onClick={() => setOpenLogsDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loadingLogs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ py: 2 }}>
              <Timeline position="right">
                {projectLogs.map((log) => (
                  <TimelineItem key={log.id}>
                    <TimelineOppositeContent sx={{ flex: 0.2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(log.checked_at)}
                      </Typography>
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot sx={{ bgcolor: getStatusColor(log.status) }}>
                        {log.status === 'changed' ? (
                          <CommitIcon />
                        ) : log.status === 'no_change' ? (
                          <CheckCircleIcon />
                        ) : (
                          <ErrorIcon />
                        )}
                      </TimelineDot>
                      <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>
                      <Paper
                        elevation={1}
                        sx={{
                          p: 2,
                          bgcolor: 'background.paper',
                          mb: 2
                        }}
                      >
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          Branch: {log.branch_name}
                        </Typography>
                        {log.status === 'changed' ? (
                          <>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              New commit: {log.commit_sha?.substring(0, 7)}
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 1 }}>
                              {log.commit_message}
                            </Typography>
                            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                by {log.commit_author}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                • {formatDate(log.commit_date)}
                              </Typography>
                            </Box>
                          </>
                        ) : log.status === 'no_change' ? (
                          <Typography variant="body2" color="text.secondary">
                            No changes detected
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="error">
                            {log.status}
                          </Typography>
                        )}
                      </Paper>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog
        open={openActionDialog}
        onClose={handleCloseActionDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 500 }}>
              {editingAction ? 'Edit Action' : 'Manage Actions'}
            </Typography>
            <IconButton onClick={handleCloseActionDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Existing Actions */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                Current Actions
              </Typography>
              {selectedProject?.actions?.length > 0 ? (
                <List>
                  {selectedProject.actions.map((action) => (
                    <Paper
                      key={action.id}
                      elevation={1}
                      sx={{ mb: 2, overflow: 'hidden' }}
                    >
                      <ListItem
                        secondaryAction={
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAction(action.id, selectedProject.id, e);
                            }}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        }
                        sx={{ bgcolor: 'background.paper' }}
                      >
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                              {action.name || 'Unnamed Action'}
                            </Typography>
                          }
                          secondary={action.action_type === 'webhook' ? 'Webhook' : 'Script'}
                        />
                      </ListItem>
                      <Divider />
                      <Box sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                        {action.webhook_url ? (
                          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                            {action.webhook_url}
                          </Typography>
                        ) : (
                          <>
                            <Typography variant="body2" sx={{
                              whiteSpace: 'pre-wrap',
                              fontFamily: 'monospace',
                              bgcolor: '#f8f8f8',
                              p: 1,
                              borderRadius: 1
                            }}>
                              {action.script_content}
                            </Typography>
                            {action.secrets && action.secrets.length > 0 && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                  Environment Variables:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                  {action.secrets.map((secret) => (
                                    <Chip
                                      key={secret.id}
                                      label={secret.name}
                                      onDelete={() => handleDeleteSecret(secret.id)}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )}
                          </>
                        )}
                      </Box>
                    </Paper>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No actions configured yet
                </Typography>
              )}
            </Grid>

            {/* Add New Action */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                {editingAction ? 'Edit Action' : 'Add New Action'}
              </Typography>
              <Box sx={{ bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
                <TextField
                  fullWidth
                  label="Action Name"
                  value={actionFormData.name}
                  onChange={(e) => setActionFormData({ ...actionFormData, name: e.target.value })}
                  margin="normal"
                  variant="outlined"
                />

                <FormControl fullWidth margin="normal">
                  <InputLabel>Action Type</InputLabel>
                  <Select
                    value={actionFormData.action_type}
                    onChange={(e) => setActionFormData({
                      ...actionFormData,
                      action_type: e.target.value,
                      webhook_url: '',
                      script_content: ''
                    })}
                    label="Action Type"
                  >
                    <MenuItem value="webhook">Webhook</MenuItem>
                    <MenuItem value="script">Bash Script</MenuItem>
                  </Select>
                </FormControl>

                {actionFormData.action_type === 'webhook' ? (
                  <TextField
                    fullWidth
                    label="Webhook URL"
                    value={actionFormData.webhook_url}
                    onChange={(e) => setActionFormData({ ...actionFormData, webhook_url: e.target.value })}
                    margin="normal"
                    variant="outlined"
                  />
                ) : (
                  <TextField
                    fullWidth
                    label="Bash Script"
                    value={actionFormData.script_content}
                    onChange={(e) => setActionFormData({ ...actionFormData, script_content: e.target.value })}
                    margin="normal"
                    variant="outlined"
                    multiline
                    rows={4}
                  />
                )}

                {/* Secrets Section */}
                {actionFormData.action_type === 'script' && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                      Environment Variables
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <TextField
                        label="Name"
                        value={newSecret.name}
                        onChange={(e) => setNewSecret({ ...newSecret, name: e.target.value })}
                        size="small"
                      />
                      <TextField
                        label="Value"
                        value={newSecret.value}
                        onChange={(e) => setNewSecret({ ...newSecret, value: e.target.value })}
                        size="small"
                      />
                      <Button
                        variant="contained"
                        onClick={handleAddSecret}
                        disabled={!newSecret.name || !newSecret.value}
                      >
                        Add
                      </Button>
                    </Box>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {secrets.map((secret) => (
                        <Chip
                          key={secret.id}
                          label={secret.name}
                          onDelete={() => handleDeleteSecret(secret.id)}
                          size="small"
                        />
                      ))}
                    </Box>
                  </Box>
                )}

                <DialogActions>
                  <Button onClick={handleCloseActionDialog}>Cancel</Button>
                  <Button
                    onClick={handleSaveAction}
                    variant="contained"
                    disabled={
                      !actionFormData.name ||
                      (actionFormData.action_type === 'webhook' && !actionFormData.webhook_url) ||
                      (actionFormData.action_type === 'script' && !actionFormData.script_content)
                    }
                  >
                    {editingAction ? 'Save Changes' : 'Add Action'}
                  </Button>
                </DialogActions>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default App
