import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import {
    Tabs, Tab, TextField, Button, Paper, Typography, Box, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Select, MenuItem, FormControl, InputLabel,
    useTheme, alpha, Divider
} from '@mui/material';
import AuthContext from '../contexts/AuthContext'; // Import AuthContext as default export

const PORT = import.meta.env.VITE_PORT || '3001';
const API_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || `http://localhost:${PORT}/api`;

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
    const theme = useTheme();
    const [tabValue, setTabValue] = useState(0);
    const { currentUser, token } = useContext(AuthContext); // Get currentUser role and token

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

    // Create axios config with token from AuthContext
    const axiosConfig = useMemo(() => ({
        headers: { Authorization: `Bearer ${token}` }
    }), [token]);

    // Fetch General Settings
    useEffect(() => {
        if (tabValue === 0 && currentUser?.role === 'admin' && token) {
            setLoadingGeneralSettings(true);
            setGeneralSettingsError('');

            axios.get(`${API_BASE_URL}/settings`, axiosConfig)
                .then(response => {
                    setGeneralSettings(response.data);
                    setNamespacesInput(response.data.kubernetes_namespaces ? response.data.kubernetes_namespaces.join(', ') : '');
                    setLoadingGeneralSettings(false);
                })
                .catch(error => {
                    console.error('Error fetching general settings:', error);
                    setGeneralSettingsError(error.response?.data?.error || 'Failed to fetch general settings.');
                    setLoadingGeneralSettings(false);
                });
        }
    }, [tabValue, currentUser, token, axiosConfig]);

    // Fetch Users
    useEffect(() => {
        if (tabValue === 1 && currentUser?.role === 'admin' && token) {
            fetchUsers();
        }
    }, [tabValue, currentUser, token, axiosConfig]);

    const fetchUsers = () => {
        setLoadingUsers(true);
        setUsersError('');

        axios.get(`${API_BASE_URL}/auth/users`, axiosConfig)
            .then(response => {
                setUsers(response.data);
                setLoadingUsers(false);
            })
            .catch(error => {
                console.error('Error fetching users:', error);
                setUsersError(error.response?.data?.error || 'Failed to fetch users.');
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
                setGeneralSettingsError(error.response?.data?.error || 'Failed to save settings.');
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


    if (currentUser?.role !== 'admin') {
        return (
            <Paper sx={{
                p: 3,
                backgroundColor: '#1a1a27',
                color: '#fff',
                borderRadius: 2,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
            }}>
                <Typography variant="h6" color="error" sx={{ fontWeight: 600 }}>Access Denied</Typography>
                <Typography sx={{ opacity: 0.8, mt: 1 }}>You do not have permission to view this page.</Typography>
            </Paper>
        );
    }

    // Dark theme styles for form inputs
    const inputSx = {
        '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(10px)',
            '& fieldset': {
                borderColor: 'rgba(33, 150, 243, 0.2)',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
            },
            '&:hover fieldset': {
                borderColor: 'rgba(33, 150, 243, 0.5)',
            },
            '&.Mui-focused fieldset': {
                borderColor: '#2196f3',
                boxShadow: '0 0 10px rgba(33, 150, 243, 0.5)',
            },
            transition: 'transform 0.2s ease, box-shadow 0.3s ease',
            '&:focus-within': {
                transform: 'translateY(-2px)',
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
            }
        },
        '& .MuiInputLabel-root': {
            color: 'rgba(255, 255, 255, 0.7)',
            '&.Mui-focused': {
                color: '#2196f3',
                textShadow: '0 0 5px rgba(33, 150, 243, 0.5)',
            }
        },
        '& .MuiInputBase-input': {
            color: '#fff',
        },
    };

    return (
        <Paper sx={{
            m: 2,
            p: 0,
            backgroundColor: '#0a0a1e',
            backgroundImage: 'radial-gradient(circle at 50% 0%, #1a1a40 0%, transparent 50%)',
            color: '#fff',
            borderRadius: '24px',
            boxShadow: '0 20px 80px rgba(0, 0, 0, 0.6), 0 0 20px rgba(33, 150, 243, 0.15)',
            overflow: 'hidden',
            border: '1px solid rgba(33, 150, 243, 0.1)',
            position: 'relative',
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, rgba(33, 150, 243, 0), rgba(33, 150, 243, 0.8), rgba(33, 150, 243, 0))',
            },
        }}>
            <Box sx={{
                p: 4,
                borderBottom: '1px solid rgba(33, 150, 243, 0.1)',
                background: 'linear-gradient(135deg, #0c0c20 0%, #1e2151 100%)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: '-50%',
                    right: '-10%',
                    width: '500px',
                    height: '500px',
                    background: 'radial-gradient(circle, rgba(33, 150, 243, 0.05) 0%, transparent 70%)',
                    animation: 'pulse 15s infinite',
                },
                '@keyframes pulse': {
                    '0%': { opacity: 0.3 },
                    '50%': { opacity: 0.8 },
                    '100%': { opacity: 0.3 },
                }
            }}>
                <Typography
                    variant="h4"
                    fontWeight="600"
                    sx={{
                        position: 'relative',
                        display: 'inline-block',
                        background: 'linear-gradient(90deg, #fff, #2196f3)',
                        backgroundClip: 'text',
                        textFillColor: 'transparent',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            bottom: -8,
                            left: 0,
                            width: '60px',
                            height: '3px',
                            background: 'linear-gradient(90deg, #2196f3, rgba(33, 150, 243, 0.3))',
                            borderRadius: '2px',
                        }
                    }}
                >
                    Settings
                </Typography>
                <Typography
                    variant="body2"
                    sx={{
                        mt: 1,
                        opacity: 0.7,
                        maxWidth: '60%',
                    }}
                >
                    Configure application settings and manage user access
                </Typography>
            </Box>

            <Box sx={{
                borderBottom: 1,
                borderColor: 'rgba(255, 255, 255, 0.05)',
                position: 'relative',
                zIndex: 1,
            }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    aria-label="settings tabs"
                    sx={{
                        '& .MuiTabs-indicator': {
                            backgroundColor: '#2196f3',
                            height: '3px',
                            borderRadius: '3px 3px 0 0',
                            boxShadow: '0 0 8px rgba(33, 150, 243, 0.8)',
                        },
                        '& .MuiTab-root': {
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontWeight: 500,
                            fontSize: '0.95rem',
                            textTransform: 'none',
                            transition: 'all 0.3s ease',
                            py: 2,
                            '&.Mui-selected': {
                                color: '#2196f3',
                                textShadow: '0 0 10px rgba(33, 150, 243, 0.5)',
                            },
                            '&:hover': {
                                color: 'rgba(33, 150, 243, 0.8)',
                                backgroundColor: 'rgba(33, 150, 243, 0.08)',
                                transform: 'translateY(-2px)',
                            },
                        },
                    }}
                >
                    <Tab label="General Settings" id="settings-tab-0" aria-controls="settings-tabpanel-0" />
                    <Tab label="User Management" id="settings-tab-1" aria-controls="settings-tabpanel-1" />
                </Tabs>
            </Box>

            {/* General Settings Tab Panel */}
            <TabPanel value={tabValue} index={0}>
                <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 500 }}>
                    General Application Settings
                </Typography>
                {loadingGeneralSettings && <CircularProgress sx={{ color: '#2196f3' }} />}
                {generalSettingsError && <Alert severity="error" sx={{ mb: 2, backgroundColor: alpha('#f44336', 0.1), color: '#f44336' }}>{generalSettingsError}</Alert>}
                {generalSettingsSuccess && <Alert severity="success" sx={{ mb: 2, backgroundColor: alpha('#4caf50', 0.1), color: '#4caf50' }}>{generalSettingsSuccess}</Alert>}
                {!loadingGeneralSettings && (
                    <Box component="form" sx={{
                        '& .MuiTextField-root': { m: 1, width: '100%', maxWidth: '500px' },
                        display: 'flex',
                        flexDirection: 'column',
                        mt: 2
                    }}>
                        <TextField
                            label="GitHub API URL"
                            name="github_api_url"
                            value={generalSettings.github_api_url || ''}
                            onChange={handleGeneralSettingsChange}
                            variant="outlined"
                            sx={inputSx}
                        />
                        <TextField
                            label="GitHub Token"
                            name="github_token"
                            type="password"
                            value={generalSettings.github_token || ''}
                            onChange={handleGeneralSettingsChange}
                            variant="outlined"
                            sx={inputSx}
                        />
                        <TextField
                            label="Kubernetes Namespaces (comma-separated)"
                            name="kubernetes_namespaces_input"
                            value={namespacesInput || ''}
                            onChange={handleGeneralSettingsChange}
                            variant="outlined"
                            helperText="e.g., default,kube-system,monitoring"
                            sx={{
                                ...inputSx,
                                '& .MuiFormHelperText-root': {
                                    color: 'rgba(255, 255, 255, 0.5)',
                                }
                            }}
                        />
                        <Button
                            variant="contained"
                            onClick={handleSaveGeneralSettings}
                            sx={{
                                mt: 3,
                                width: 'fit-content',
                                backgroundColor: 'rgba(33, 150, 243, 0.8)',
                                backgroundImage: 'linear-gradient(135deg, #2196f3, #0d47a1)',
                                boxShadow: '0 4px 20px rgba(33, 150, 243, 0.4)',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden',
                                '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: '-100%',
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                                    transition: 'all 0.6s ease',
                                },
                                '&:hover': {
                                    backgroundColor: '#1976d2',
                                    transform: 'translateY(-3px)',
                                    boxShadow: '0 7px 30px rgba(33, 150, 243, 0.6)',
                                    '&::before': {
                                        left: '100%',
                                    }
                                },
                                '&:active': {
                                    transform: 'translateY(1px)',
                                }
                            }}
                            disabled={loadingGeneralSettings}
                        >
                            Save General Settings
                        </Button>
                    </Box>
                )}
            </TabPanel>

            {/* User Management Tab Panel */}
            <TabPanel value={tabValue} index={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 500 }}>User Management</Typography>
                    <Button
                        variant="contained"
                        onClick={handleCreateUserDialogOpen}
                        sx={{
                            backgroundColor: '#2196f3',
                            '&:hover': {
                                backgroundColor: '#1976d2',
                            }
                        }}
                    >
                        Create User
                    </Button>
                </Box>
                {loadingUsers && <CircularProgress sx={{ color: '#2196f3' }} />}
                {usersError && <Alert severity="error" sx={{ mb: 2, backgroundColor: alpha('#f44336', 0.1), color: '#f44336' }}>{usersError}</Alert>}
                {usersSuccess && <Alert severity="success" sx={{ mb: 2, backgroundColor: alpha('#4caf50', 0.1), color: '#4caf50' }}>{usersSuccess}</Alert>}

                <TableContainer component={Paper} sx={{
                    backgroundColor: 'rgba(20, 20, 40, 0.6)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    border: '1px solid rgba(33, 150, 243, 0.1)',
                    overflow: 'hidden',
                }}>
                    <Table sx={{ minWidth: 650 }} aria-label="user management table">
                        <TableHead>
                            <TableRow sx={{
                                background: 'linear-gradient(90deg, rgba(33, 150, 243, 0.1), rgba(33, 150, 243, 0.05))'
                            }}>
                                <TableCell sx={{
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    borderBottom: '1px solid rgba(33, 150, 243, 0.2)',
                                    fontWeight: 500,
                                }}>Username</TableCell>
                                <TableCell sx={{
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    borderBottom: '1px solid rgba(33, 150, 243, 0.2)',
                                    fontWeight: 500,
                                }}>Role</TableCell>
                                <TableCell sx={{
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    borderBottom: '1px solid rgba(33, 150, 243, 0.2)',
                                    fontWeight: 500,
                                }}>Created At</TableCell>
                                <TableCell sx={{
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    borderBottom: '1px solid rgba(33, 150, 243, 0.2)',
                                    fontWeight: 500,
                                }}>Updated At</TableCell>
                                <TableCell sx={{
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    borderBottom: '1px solid rgba(33, 150, 243, 0.2)',
                                    fontWeight: 500,
                                }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map((u) => (
                                <TableRow key={u.id} sx={{
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                        transform: 'scale(1.01)',
                                        boxShadow: 'inset 0 0 20px rgba(33, 150, 243, 0.05)'
                                    }
                                }}>
                                    <TableCell sx={{
                                        color: '#fff',
                                        borderBottom: '1px solid rgba(33, 150, 243, 0.1)'
                                    }}>
                                        {u.username}
                                    </TableCell>
                                    <TableCell sx={{
                                        color: '#fff',
                                        borderBottom: '1px solid rgba(33, 150, 243, 0.1)'
                                    }}>
                                        <Box sx={{
                                            display: 'inline-block',
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: '20px',
                                            backgroundColor: u.role === 'admin' ? 'rgba(33, 150, 243, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                            color: u.role === 'admin' ? '#2196f3' : '#fff',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            border: u.role === 'admin' ? '1px solid rgba(33, 150, 243, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                                            boxShadow: u.role === 'admin' ? '0 0 10px rgba(33, 150, 243, 0.2)' : 'none',
                                            textShadow: u.role === 'admin' ? '0 0 5px rgba(33, 150, 243, 0.5)' : 'none',
                                        }}>
                                            {u.role}
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{
                                        color: '#fff',
                                        borderBottom: '1px solid rgba(33, 150, 243, 0.1)'
                                    }}>
                                        {new Date(u.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell sx={{
                                        color: '#fff',
                                        borderBottom: '1px solid rgba(33, 150, 243, 0.1)'
                                    }}>
                                        {new Date(u.updatedAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell sx={{
                                        borderBottom: '1px solid rgba(33, 150, 243, 0.1)'
                                    }}>
                                        <Button
                                            size="small"
                                            onClick={() => handleEditUserDialogOpen(u)}
                                            sx={{
                                                mr: 1,
                                                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                                color: '#fff',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                                                },
                                                '&.Mui-disabled': {
                                                    color: 'rgba(255, 255, 255, 0.3)',
                                                }
                                            }}
                                            disabled={u.id === currentUser.id && u.role === 'admin' && users.filter(adm => adm.role === 'admin').length === 1}
                                        >
                                            Edit Role
                                        </Button>
                                        <Button
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteUserDialogOpen(u)}
                                            disabled={u.id === currentUser.id}
                                            sx={{
                                                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s ease',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(244, 67, 54, 0.2)',
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                                                },
                                                '&.Mui-disabled': {
                                                    color: 'rgba(255, 255, 255, 0.3)',
                                                }
                                            }}
                                        >
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
            <Dialog
                open={openCreateUserDialog}
                onClose={handleCreateUserDialogClose}
                PaperProps={{
                    sx: {
                        backgroundColor: '#252536',
                        color: '#fff',
                        borderRadius: 2,
                    }
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Create New User</DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <TextField
                        autoFocus
                        margin="dense"
                        name="username"
                        label="Username"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newUser.username}
                        onChange={handleNewUserChange}
                        sx={inputSx}
                    />
                    <TextField
                        margin="dense"
                        name="password"
                        label="Password"
                        type="password"
                        fullWidth
                        variant="outlined"
                        value={newUser.password}
                        onChange={handleNewUserChange}
                        sx={inputSx}
                    />
                    <FormControl
                        fullWidth
                        margin="dense"
                        variant="outlined"
                        sx={{ mt: 2, ...inputSx }}
                    >
                        <InputLabel id="create-user-role-label">Role</InputLabel>
                        <Select
                            labelId="create-user-role-label"
                            name="role"
                            value={newUser.role}
                            onChange={handleNewUserChange}
                            label="Role"
                            sx={{
                                color: '#fff',
                                '& .MuiSvgIcon-root': {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                }
                            }}
                        >
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <Button
                        onClick={handleCreateUserDialogClose}
                        sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': {
                                color: '#fff',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateUser}
                        disabled={loadingUsers}
                        sx={{
                            backgroundColor: '#2196f3',
                            color: '#fff',
                            '&:hover': {
                                backgroundColor: '#1976d2',
                            },
                            '&.Mui-disabled': {
                                color: 'rgba(255, 255, 255, 0.3)',
                            }
                        }}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit User Role Dialog */}
            <Dialog
                open={openEditUserDialog}
                onClose={handleEditUserDialogClose}
                PaperProps={{
                    sx: {
                        backgroundColor: '#252536',
                        color: '#fff',
                        borderRadius: 2,
                    }
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>Edit User Role</DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                        Change role for user: <span style={{ color: '#2196f3', fontWeight: 500 }}>{currentUserToEdit?.username}</span>
                    </DialogContentText>
                    <FormControl
                        fullWidth
                        margin="dense"
                        variant="outlined"
                        sx={inputSx}
                    >
                        <InputLabel id="edit-user-role-label">New Role</InputLabel>
                        <Select
                            labelId="edit-user-role-label"
                            value={editUserRole}
                            onChange={handleEditUserRoleChange}
                            label="New Role"
                            sx={{
                                color: '#fff',
                                '& .MuiSvgIcon-root': {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                }
                            }}
                        >
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <Button
                        onClick={handleEditUserDialogClose}
                        sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': {
                                color: '#fff',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpdateUserRole}
                        disabled={loadingUsers}
                        sx={{
                            backgroundColor: '#2196f3',
                            color: '#fff',
                            '&:hover': {
                                backgroundColor: '#1976d2',
                            },
                            '&.Mui-disabled': {
                                color: 'rgba(255, 255, 255, 0.3)',
                            }
                        }}
                    >
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete User Confirmation Dialog */}
            <Dialog
                open={openDeleteUserDialog}
                onClose={handleDeleteUserDialogClose}
                PaperProps={{
                    sx: {
                        backgroundColor: '#252536',
                        color: '#fff',
                        borderRadius: 2,
                    }
                }}
            >
                <DialogTitle sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#f44336' }}>Delete User</DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Are you sure you want to delete user: <span style={{ color: '#f44336', fontWeight: 500 }}>{currentUserToDelete?.username}</span>? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <Button
                        onClick={handleDeleteUserDialogClose}
                        sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': {
                                color: '#fff',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteUser}
                        color="error"
                        disabled={loadingUsers}
                        sx={{
                            backgroundColor: 'rgba(244, 67, 54, 0.1)',
                            '&:hover': {
                                backgroundColor: 'rgba(244, 67, 54, 0.2)',
                            },
                            '&.Mui-disabled': {
                                color: 'rgba(255, 255, 255, 0.3)',
                            }
                        }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

        </Paper>
    );
};

export default SettingsPage;
