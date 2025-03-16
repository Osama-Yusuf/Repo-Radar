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

    return router;
}

module.exports = setupProjectRoutes;
