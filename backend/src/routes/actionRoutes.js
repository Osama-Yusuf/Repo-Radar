const express = require('express');
const router = express.Router();

function setupActionRoutes(actionController) {
    /**
     * @swagger
     * /projects/{projectId}/actions:
     *   get:
     *     summary: Get project actions
     *     tags: [Actions]
     */
    router.get('/projects/:projectId/actions', actionController.getProjectActions.bind(actionController));

    /**
     * @swagger
     * /projects/{projectId}/actions:
     *   post:
     *     summary: Create project action
     *     tags: [Actions]
     */
    router.post('/projects/:projectId/actions', actionController.createAction.bind(actionController));

    /**
     * @swagger
     * /projects/{projectId}/actions/{actionId}:
     *   put:
     *     summary: Update project action
     *     tags: [Actions]
     */
    router.put('/projects/:projectId/actions/:actionId', actionController.updateAction.bind(actionController));

    /**
     * @swagger
     * /projects/{projectId}/actions/{actionId}:
     *   delete:
     *     summary: Delete project action
     *     tags: [Actions]
     */
    router.delete('/projects/:projectId/actions/:actionId', actionController.deleteAction.bind(actionController));

    /**
     * @swagger
     * /actions/{actionId}/secrets:
     *   get:
     *     summary: Get action secrets
     *     tags: [Secrets]
     */
    router.get('/actions/:actionId/secrets', actionController.getActionSecrets.bind(actionController));

    /**
     * @swagger
     * /actions/{actionId}/secrets:
     *   post:
     *     summary: Create action secret
     *     tags: [Secrets]
     */
    router.post('/actions/:actionId/secrets', actionController.createSecret.bind(actionController));

    /**
     * @swagger
     * /actions/{actionId}/secrets/{secretId}:
     *   put:
     *     summary: Update action secret
     *     tags: [Secrets]
     */
    router.put('/actions/:actionId/secrets/:secretId', actionController.updateSecret.bind(actionController));

    /**
     * @swagger
     * /actions/{actionId}/secrets/{secretId}:
     *   delete:
     *     summary: Delete action secret
     *     tags: [Secrets]
     */
    router.delete('/actions/:actionId/secrets/:secretId', actionController.deleteSecret.bind(actionController));

    return router;
}

module.exports = setupActionRoutes;
