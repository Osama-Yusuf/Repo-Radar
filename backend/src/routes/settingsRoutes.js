const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware'); // Import actual isAdmin

// GET /api/settings - Get current application settings
router.get('/', verifyToken, isAdmin, getSettings);

// PUT /api/settings - Update application settings
router.put('/', verifyToken, isAdmin, updateSettings);

module.exports = router;
