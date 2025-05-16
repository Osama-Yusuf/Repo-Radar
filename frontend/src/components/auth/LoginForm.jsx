import { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    CircularProgress,
    Alert
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const LoginForm = ({ onSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }

        try {
            setLoading(true);
            setError('');

            await login(username, password);

            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper
            elevation={3}
            sx={{
                p: 4,
                maxWidth: 400,
                mx: 'auto',
                backgroundColor: '#1E213A',
                borderRadius: 2,
                border: '1px solid #2D325A'
            }}
        >
            <Typography variant="h5" component="h1" gutterBottom sx={{ color: '#fff', fontWeight: 600, mb: 3 }}>
                Login to Repo Radar
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3, backgroundColor: 'rgba(211, 47, 47, 0.1)', color: '#ff6b6b' }}>
                    {error}
                </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
                <TextField
                    label="Username"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    InputLabelProps={{ style: { color: '#8B8DA0' } }}
                    sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                                borderColor: '#2D325A',
                            },
                            '&:hover fieldset': {
                                borderColor: '#3F51B5',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: '#3F51B5',
                            },
                            '& input': {
                                color: '#fff',
                            },
                        },
                    }}
                />

                <TextField
                    label="Password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    InputLabelProps={{ style: { color: '#8B8DA0' } }}
                    sx={{
                        mb: 3,
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                                borderColor: '#2D325A',
                            },
                            '&:hover fieldset': {
                                borderColor: '#3F51B5',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: '#3F51B5',
                            },
                            '& input': {
                                color: '#fff',
                            },
                        },
                    }}
                />

                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    disabled={loading}
                    sx={{
                        py: 1.5,
                        backgroundColor: '#2196F3',
                        '&:hover': {
                            backgroundColor: '#1976D2',
                        },
                        mb: 2
                    }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                </Button>

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Typography variant="body2" sx={{ color: '#8B8DA0' }}>
                        Contact your administrator for account access
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
};

export default LoginForm;
