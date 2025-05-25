import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
    Tabs, Tab, TextField, Button, Paper, Typography, Box, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { AuthContext } from '../context/AuthContext'; // Assuming AuthContext is here

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const SettingsPage = () => {
    const [tabValue, setTabValue] = useState(0);
    const { user, token } = useContext(AuthContext); // Get user role and token

    // General Settings State
    const [generalSettings, setGeneralSettings] = useState({
        github_api_url: '',
        github_token: '',
        kubernetes_namespaces: []
    });
    const [loadingGeneralSettings, setLoadingGeneralSettings] = useState(false);
    const [generalSettingsError, setGeneralSettingsError] = useState('');
    const [generalSettingsSuccess, setGeneralSettingsSuccess] = useState('');
    const [namespacesInput, setNamespacesInput] = useState('');


    // User Management State
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [usersError, setUsersError] = useState('');
    const [usersSuccess, setUsersSuccess] = useState('');

    // Dialog states
    const [openCreateUserDialog, setOpenCreateUserDialog] = useState(false);
    const [openEditUserDialog, setOpenEditUserDialog] = useState(false);
    const [openDeleteUserDialog, setOpenDeleteUserDialog] = useState(false);
    
    const [currentUserToEdit, setCurrentUserToEdit] = useState(null);
    const [currentUserToDelete, setCurrentUserToDelete] = useState(null);

    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
    const [editUserRole, setEditUserRole] = useState('user');


    const axiosConfig = {
        headers: { Authorization: `Bearer ${token}` }
    };

    // Fetch General Settings
    useEffect(() => {
        if (tabValue === 0 && user?.role === 'admin') {
            setLoadingGeneralSettings(true);
            axios.get(`${API_BASE_URL}/settings`, axiosConfig)
                .then(response => {
                    setGeneralSettings(response.data);
                    setNamespacesInput(response.data.kubernetes_namespaces ? response.data.kubernetes_namespaces.join(', ') : '');
                    setLoadingGeneralSettings(false);
                })
                .catch(error => {
                    console.error('Error fetching general settings:', error);
                    setGeneralSettingsError('Failed to fetch general settings.');
                    setLoadingGeneralSettings(false);
                });
        }
    }, [tabValue, user, token]);

    // Fetch Users
    useEffect(() => {
        if (tabValue === 1 && user?.role === 'admin') {
            fetchUsers();
        }
    }, [tabValue, user, token]);

    const fetchUsers = () => {
        setLoadingUsers(true);
        axios.get(`${API_BASE_URL}/auth/users`, axiosConfig)
            .then(response => {
                setUsers(response.data);
                setLoadingUsers(false);
            })
            .catch(error => {
                console.error('Error fetching users:', error);
                setUsersError('Failed to fetch users.');
                setLoadingUsers(false);
            });
    };
    
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setGeneralSettingsError('');
        setGeneralSettingsSuccess('');
        setUsersError('');
        setUsersSuccess('');
    };

    const handleGeneralSettingsChange = (event) => {
        const { name, value } = event.target;
        if (name === "kubernetes_namespaces_input") {
            setNamespacesInput(value);
        } else {
            setGeneralSettings(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSaveGeneralSettings = () => {
        setLoadingGeneralSettings(true);
        setGeneralSettingsError('');
        setGeneralSettingsSuccess('');
        const namespacesArray = namespacesInput.split(',').map(ns => ns.trim()).filter(ns => ns);
        const payload = { ...generalSettings, kubernetes_namespaces: namespacesArray };

        axios.put(`${API_BASE_URL}/settings`, payload, axiosConfig)
            .then(response => {
                setGeneralSettingsSuccess('Settings saved successfully!');
                setGeneralSettings(response.data.settings); // Update state with returned settings
                setNamespacesInput(response.data.settings.kubernetes_namespaces ? response.data.settings.kubernetes_namespaces.join(', ') : '');
                setLoadingGeneralSettings(false);
            })
            .catch(error => {
                console.error('Error saving general settings:', error);
                setGeneralSettingsError(error.response?.data?.message || 'Failed to save settings.');
                setLoadingGeneralSettings(false);
            });
    };

    // User Management Handlers
    const handleCreateUserDialogOpen = () => setOpenCreateUserDialog(true);
    const handleCreateUserDialogClose = () => {
        setOpenCreateUserDialog(false);
        setNewUser({ username: '', password: '', role: 'user' }); // Reset form
    };

    const handleNewUserChange = (event) => {
        const { name, value } = event.target;
        setNewUser(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateUser = () => {
        setLoadingUsers(true);
        axios.post(`${API_BASE_URL}/auth/users`, newUser, axiosConfig)
            .then(() => {
                setUsersSuccess('User created successfully!');
                fetchUsers(); // Refresh list
                handleCreateUserDialogClose();
            })
            .catch(error => {
                console.error('Error creating user:', error);
                setUsersError(error.response?.data?.error || 'Failed to create user.');
                setLoadingUsers(false); // Stop loading only on error here, fetchUsers will handle it on success
            });
    };

    const handleEditUserDialogOpen = (userToEdit) => {
        setCurrentUserToEdit(userToEdit);
        setEditUserRole(userToEdit.role);
        setOpenEditUserDialog(true);
    };
    const handleEditUserDialogClose = () => {
        setOpenEditUserDialog(false);
        setCurrentUserToEdit(null);
    };

    const handleEditUserRoleChange = (event) => setEditUserRole(event.target.value);

    const handleUpdateUserRole = () => {
        if (!currentUserToEdit) return;
        setLoadingUsers(true);
        axios.put(`${API_BASE_URL}/auth/users/${currentUserToEdit.id}/role`, { newRole: editUserRole }, axiosConfig)
            .then(() => {
                setUsersSuccess('User role updated successfully!');
                fetchUsers();
                handleEditUserDialogClose();
            })
            .catch(error => {
                console.error('Error updating user role:', error);
                setUsersError(error.response?.data?.error || 'Failed to update user role.');
                setLoadingUsers(false);
            });
    };

    const handleDeleteUserDialogOpen = (userToDelete) => {
        setCurrentUserToDelete(userToDelete);
        setOpenDeleteUserDialog(true);
    };
    const handleDeleteUserDialogClose = () => {
        setOpenDeleteUserDialog(false);
        setCurrentUserToDelete(null);
    };

    const handleDeleteUser = () => {
        if (!currentUserToDelete) return;
        setLoadingUsers(true);
        axios.delete(`${API_BASE_URL}/auth/users/${currentUserToDelete.id}`, axiosConfig)
            .then(() => {
                setUsersSuccess('User deleted successfully!');
                fetchUsers();
                handleDeleteUserDialogClose();
            })
            .catch(error => {
                console.error('Error deleting user:', error);
                setUsersError(error.response?.data?.error || 'Failed to delete user.');
                setLoadingUsers(false);
            });
    };


    if (user?.role !== 'admin') {
        return (
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" color="error">Access Denied</Typography>
                <Typography>You do not have permission to view this page.</Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ m: 2, p: 2 }}>
            <Typography variant="h4" gutterBottom>Settings</Typography>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
                    <Tab label="General Settings" id="settings-tab-0" aria-controls="settings-tabpanel-0" />
                    <Tab label="User Management" id="settings-tab-1" aria-controls="settings-tabpanel-1" />
                </Tabs>
            </Box>

            {/* General Settings Tab Panel */}
            <TabPanel value={tabValue} index={0}>
                <Typography variant="h6" gutterBottom>General Application Settings</Typography>
                {loadingGeneralSettings && <CircularProgress />}
                {generalSettingsError && <Alert severity="error" sx={{ mb: 2 }}>{generalSettingsError}</Alert>}
                {generalSettingsSuccess && <Alert severity="success" sx={{ mb: 2 }}>{generalSettingsSuccess}</Alert>}
                {!loadingGeneralSettings && (
                    <Box component="form" sx={{ '& .MuiTextField-root': { m: 1, width: '50ch' }, display: 'flex', flexDirection: 'column' }}>
                        <TextField
                            label="GitHub API URL"
                            name="github_api_url"
                            value={generalSettings.github_api_url || ''}
                            onChange={handleGeneralSettingsChange}
                            variant="outlined"
                        />
                        <TextField
                            label="GitHub Token"
                            name="github_token"
                            type="password"
                            value={generalSettings.github_token || ''}
                            onChange={handleGeneralSettingsChange}
                            variant="outlined"
                        />
                        <TextField
                            label="Kubernetes Namespaces (comma-separated)"
                            name="kubernetes_namespaces_input"
                            value={namespacesInput || ''}
                            onChange={handleGeneralSettingsChange}
                            variant="outlined"
                            helperText="e.g., default,kube-system,monitoring"
                        />
                        <Button variant="contained" onClick={handleSaveGeneralSettings} sx={{ mt: 2, width: 'fit-content' }} disabled={loadingGeneralSettings}>
                            Save General Settings
                        </Button>
                    </Box>
                )}
            </TabPanel>

            {/* User Management Tab Panel */}
            <TabPanel value={tabValue} index={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">User Management</Typography>
                    <Button variant="contained" onClick={handleCreateUserDialogOpen}>Create User</Button>
                </Box>
                {loadingUsers && <CircularProgress />}
                {usersError && <Alert severity="error" sx={{ mb: 2 }}>{usersError}</Alert>}
                {usersSuccess && <Alert severity="success" sx={{ mb: 2 }}>{usersSuccess}</Alert>}
                
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Username</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Created At</TableCell>
                                <TableCell>Updated At</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((u) => (
                                <TableRow key={u.id}>
                                    <TableCell>{u.username}</TableCell>
                                    <TableCell>{u.role}</TableCell>
                                    <TableCell>{new Date(u.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>{new Date(u.updatedAt).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Button size="small" onClick={() => handleEditUserDialogOpen(u)} sx={{ mr: 1 }} disabled={u.id === user.id && u.role === 'admin' && users.filter(adm => adm.role === 'admin').length === 1}>
                                            Edit Role
                                        </Button>
                                        <Button size="small" color="error" onClick={() => handleDeleteUserDialogOpen(u)} disabled={u.id === user.id}>
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </TabPanel>

            {/* Create User Dialog */}
            <Dialog open={openCreateUserDialog} onClose={handleCreateUserDialogClose}>
                <DialogTitle>Create New User</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" name="username" label="Username" type="text" fullWidth variant="standard" value={newUser.username} onChange={handleNewUserChange} />
                    <TextField margin="dense" name="password" label="Password" type="password" fullWidth variant="standard" value={newUser.password} onChange={handleNewUserChange} />
                    <FormControl fullWidth margin="dense" variant="standard">
                        <InputLabel id="create-user-role-label">Role</InputLabel>
                        <Select labelId="create-user-role-label" name="role" value={newUser.role} onChange={handleNewUserChange} label="Role">
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCreateUserDialogClose}>Cancel</Button>
                    <Button onClick={handleCreateUser} disabled={loadingUsers}>Create</Button>
                </DialogActions>
            </Dialog>

            {/* Edit User Role Dialog */}
            <Dialog open={openEditUserDialog} onClose={handleEditUserDialogClose}>
                <DialogTitle>Edit User Role</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Change role for user: {currentUserToEdit?.username}
                    </DialogContentText>
                    <FormControl fullWidth margin="dense" variant="standard">
                        <InputLabel id="edit-user-role-label">New Role</InputLabel>
                        <Select labelId="edit-user-role-label" value={editUserRole} onChange={handleEditUserRoleChange} label="New Role">
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleEditUserDialogClose}>Cancel</Button>
                    <Button onClick={handleUpdateUserRole} disabled={loadingUsers}>Save Changes</Button>
                </DialogActions>
            </Dialog>

            {/* Delete User Confirmation Dialog */}
            <Dialog open={openDeleteUserDialog} onClose={handleDeleteUserDialogClose}>
                <DialogTitle>Delete User</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete user: {currentUserToDelete?.username}? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteUserDialogClose}>Cancel</Button>
                    <Button onClick={handleDeleteUser} color="error" disabled={loadingUsers}>Delete</Button>
                </DialogActions>
            </Dialog>

        </Paper>
    );
};

export default SettingsPage;
