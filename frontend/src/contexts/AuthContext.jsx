import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const PORT = import.meta.env.VITE_PORT || '3001';
const API_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || `http://localhost:${PORT}/api`;

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));

    // Initialize authentication state from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (storedToken && user) {
            setToken(storedToken);
            setCurrentUser(JSON.parse(user));
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

            // Verify user status immediately on load
            verifyUserStatus(storedToken);
        }

        setLoading(false);
    }, []);

    // Periodically verify user status (every 2 minutes)
    useEffect(() => {
        if (!token) return;

        // Initial verification
        verifyUserStatus(token);

        // Set up periodic verification
        const intervalId = setInterval(() => {
            verifyUserStatus(token);
        }, 2 * 60 * 1000); // 2 minutes

        return () => clearInterval(intervalId);
    }, [token]);

    // Function to verify user status and update role if needed
    const verifyUserStatus = async (currentToken) => {
        if (!currentToken) return;

        try {
            const response = await axios.get(`${API_BASE_URL}/auth/verify`, {
                headers: { Authorization: `Bearer ${currentToken}` }
            });

            // Update user information if it has changed
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (response.data.user && (storedUser.role !== response.data.user.role)) {
                // Update localStorage and state with new user data
                localStorage.setItem('user', JSON.stringify(response.data.user));
                setCurrentUser(response.data.user);
            }
        } catch (error) {
            // If verification fails (user deleted or token invalid), log out
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                logout();
            }
        }
    };

    // Register a new user
    const register = async (username, password) => {
        try {
            setError(null);
            const response = await axios.post(`${API_BASE_URL}/auth/register`, {
                username,
                password
            });
            return response.data;
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
            throw err;
        }
    };

    // Login user
    const login = async (username, password) => {
        try {
            setError(null);
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                username,
                password
            });

            const { token, user } = response.data;

            // Save to localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Set current user
            setCurrentUser(user);

            // Set authorization header for future requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            // Update token state
            setToken(token);

            return user;
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
            throw err;
        }
    };

    // Logout user
    const logout = () => {
        // Remove from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Clear current user
        setCurrentUser(null);

        // Remove authorization header
        delete axios.defaults.headers.common['Authorization'];

        // Clear token state
        setToken(null);
    };

    // Check if user is authenticated
    const isAuthenticated = () => {
        return !!currentUser;
    };

    const value = {
        currentUser,
        loading,
        error,
        register,
        login,
        logout,
        isAuthenticated,
        token // Expose token in the context
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;