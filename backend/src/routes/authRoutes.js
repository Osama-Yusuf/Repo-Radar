const express = require('express');
const AuthController = require('../controllers/authController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware'); // Import isAdmin

function setupAuthRoutes(authController) {
    const router = express.Router();

    // Register a new user (public)
    router.post('/register', (req, res) => authController.register(req, res));

    // Login user (public)
    router.post('/login', (req, res) => authController.login(req, res));

    // Get current user info (protected, any authenticated user)
    router.get('/me', verifyToken, (req, res) => authController.getCurrentUser(req, res));

    // --- Admin User Management Routes ---
    // List all users (admin only)
    router.get('/users', verifyToken, isAdmin, (req, res) => authController.listUsers(req, res));

    // Create a new user (admin only)
    router.post('/users', verifyToken, isAdmin, (req, res) => authController.createUser(req, res));

    // Update user role (admin only)
    router.put('/users/:userId/role', verifyToken, isAdmin, (req, res) => authController.updateUserRole(req, res));

    // Delete a user (admin only)
    router.delete('/users/:userId', verifyToken, isAdmin, (req, res) => authController.deleteUser(req, res));
    
    return router;
}

module.exports = setupAuthRoutes;
