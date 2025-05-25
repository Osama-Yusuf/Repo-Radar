import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const AdminRoute = ({ children }) => {
    const { currentUser, loading } = useAuth();
    const location = useLocation();

    // While checking authentication status, show a loading spinner
    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                }}
            >
                <CircularProgress color="primary" />
            </Box>
        );
    }

    // If not authenticated or not an admin, redirect to home page
    if (!currentUser || currentUser.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    // If authenticated and admin, render the protected component
    return children;
};

export default AdminRoute;
