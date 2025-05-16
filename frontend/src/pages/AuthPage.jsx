import { useEffect } from 'react';
import { Box, Container } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../contexts/AuthContext';

const AuthPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Get the redirect path from location state or default to home
    const from = location.state?.from?.pathname || '/';

    // Redirect to original destination or home if already logged in
    useEffect(() => {
        if (isAuthenticated()) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    const handleAuthSuccess = () => {
        // Redirect to original destination or home page after successful authentication
        navigate(from, { replace: true });
    };

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    py: 4
                }}
            >
                <LoginForm onSuccess={handleAuthSuccess} />
            </Box>
        </Container>
    );
};

export default AuthPage;
