const express = require('express');
const AppStatusController = require('../controllers/appStatusController');
const { db } = require('../config/drizzle-client'); // Assuming db instance is needed for controller
// const { authMiddleware, adminAuthMiddleware } = require('../middleware/authMiddleware'); // Placeholder for auth

const router = express.Router();
const appStatusController = new AppStatusController(db); // Pass db instance if controller constructor expects it

// POST /api/status/endpoints - Add a new custom monitored endpoint
// Assuming admin rights are needed to add new endpoints
router.post(
    '/endpoints',
    // adminAuthMiddleware, // Placeholder: Protect with admin authentication
    appStatusController.addCustomEndpoint.bind(appStatusController)
);

// PUT /api/status/endpoints/:endpointId - Update an existing custom monitored endpoint
// Assuming admin rights are needed to update endpoints
router.put(
    '/endpoints/:endpointId',
    // adminAuthMiddleware, // Placeholder: Protect with admin authentication
    appStatusController.updateCustomEndpoint.bind(appStatusController)
);

// DELETE /api/status/endpoints/:endpointId - Delete a custom monitored endpoint
// Assuming admin rights are needed to delete endpoints
router.delete(
    '/endpoints/:endpointId',
    // adminAuthMiddleware, // Placeholder: Protect with admin authentication
    appStatusController.deleteCustomEndpoint.bind(appStatusController)
);

// GET /api/status/endpoints - List all non-deleted monitored endpoints with their latest status
// This route might be public or protected by general auth based on requirements
router.get(
    '/endpoints',
    // authMiddleware, // Placeholder: Potentially protect with general authentication
    appStatusController.listEndpoints.bind(appStatusController)
);

// GET /api/status/endpoints/:endpointId/history - Get status history for a specific endpoint
// This route might be public or protected by general auth based on requirements
router.get(
    '/endpoints/:endpointId/history',
    // authMiddleware, // Placeholder: Potentially protect with general authentication
    appStatusController.getEndpointHistory.bind(appStatusController)
);

module.exports = router;
