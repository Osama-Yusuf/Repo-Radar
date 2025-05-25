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

    // Initialize authentication state from localStorage
    useEffect(() => {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');

        if (token && user) {
            setCurrentUser(JSON.parse(user));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        setLoading(false);
    }, []);

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
        isAuthenticated
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;