const express = require('express');
const router = express.Router();

function setupProjectRoutes(projectController) {
    /**
     * @swagger
     * /projects:
     *   get:
     *     summary: Get all projects
     *     tags: [Projects]
     */
    router.get('/', projectController.getAllProjects.bind(projectController));

    /**
     * @swagger
     * /projects/{id}:
     *   get:
     *     summary: Get a single project
     *     tags: [Projects]
     */
    router.get('/:id', projectController.getProjectById.bind(projectController));

    /**
     * @swagger
     * /projects:
     *   post:
     *     summary: Create a new project
     *     tags: [Projects]
     */
    router.post('/', projectController.createProject.bind(projectController));

    /**
     * @swagger
     * /projects/{id}:
     *   put:
     *     summary: Update a project
     *     tags: [Projects]
     */
    router.put('/:id', projectController.updateProject.bind(projectController));

    /**
     * @swagger
     * /projects/{id}:
     *   delete:
     *     summary: Delete a project
     *     tags: [Projects]
     */
    router.delete('/:id', projectController.deleteProject.bind(projectController));

    /**
     * @swagger
     * /projects/{projectId}/logs:
     *   get:
     *     summary: Get project logs
     *     tags: [Logs]
     */
    router.get('/:projectId/logs', projectController.getProjectLogs.bind(projectController));

    /**
     * @swagger
     * /projects/{projectId}/trigger:
     *   post:
     *     summary: Trigger project actions for a specific branch
     *     tags: [Projects]
     *     parameters:
     *       - in: path
     *         name: projectId
     *         required: true
     *         schema:
     *           type: string
     *         description: Project ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               branch:
     *                 type: string
     *                 description: Branch name to trigger actions for
     *     responses:
     *       200:
     *         description: Actions triggered successfully
     *       404:
     *         description: Project not found
     *       500:
     *         description: Server error
     */
    router.post('/:projectId/trigger', projectController.triggerActions.bind(projectController));

    /**
     * @swagger
     * /projects/export:
     *   get:
     *     summary: Export all projects configuration
     *     tags: [Projects]
     */
    router.get('/export/all', projectController.exportProjects.bind(projectController));

    /**
     * @swagger
     * /projects/import:
     *   post:
     *     summary: Import projects configuration
     *     tags: [Projects]
     */
    router.post('/import', projectController.importProjects.bind(projectController));

    return router;
}

module.exports = setupProjectRoutes;
