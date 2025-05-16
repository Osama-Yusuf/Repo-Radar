const express = require('express');
const AuthController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

function setupAuthRoutes(authController) {
    const router = express.Router();

    // Register a new user
    router.post('/register', (req, res) => authController.register(req, res));

    // Login user
    router.post('/login', (req, res) => authController.login(req, res));

    // Get current user info (protected route)
    router.get('/me', verifyToken, (req, res) => authController.getCurrentUser(req, res));

    return router;
}

module.exports = setupAuthRoutes;
