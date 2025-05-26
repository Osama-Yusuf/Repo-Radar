const { db } = require('../config/drizzle-client');
const { monitored_endpoints, endpoint_status_history } = require('../schema/schema');
const { eq, desc, and, sql, gte, lte, isNull } = require('drizzle-orm');

class AppStatusController {
    constructor(dbInstance) {
        this.db = dbInstance || db;
    }

    async addCustomEndpoint(req, res) {
        const { name, url, check_interval_seconds } = req.body;

        if (!name || !url) {
            return res.status(400).json({ error: 'Name and URL are required.' });
        }

        const interval = parseInt(check_interval_seconds, 10);
        const validInterval = !isNaN(interval) && interval >= 15 ? interval : 60; // Min 15s, default 60s

        try {
            const [newEndpoint] = await this.db.insert(monitored_endpoints)
                .values({
                    name,
                    url,
                    check_interval_seconds: validInterval,
                    type: 'custom', // Explicitly set type
                    is_deleted: false,
                    // created_at and updated_at will use defaultNow()
                })
                .returning();
            
            // Manually trigger an initial check if the scheduler service is available
            // For now, just return the created endpoint
            // if (this.appStatusSchedulerService) {
            //    this.appStatusSchedulerService.performChecks(); // Or a targeted check for the new endpoint
            // }

            res.status(201).json(newEndpoint);
        } catch (error) {
            if (error.message && error.message.includes('monitored_endpoints_url_unique')) {
                return res.status(409).json({ error: 'An endpoint with this URL already exists.' });
            }
            console.error('Error adding custom endpoint:', error);
            res.status(500).json({ error: 'Failed to add custom endpoint.' });
        }
    }

    async updateCustomEndpoint(req, res) {
        const { endpointId } = req.params;
        const { name, url, check_interval_seconds } = req.body;

        if (isNaN(parseInt(endpointId))) {
            return res.status(400).json({ error: 'Invalid endpoint ID.'});
        }

        const updates = { updated_at: new Date() };
        if (name) updates.name = name;
        if (url) updates.url = url;
        if (check_interval_seconds) {
            const interval = parseInt(check_interval_seconds, 10);
            if (!isNaN(interval) && interval >= 15) { // Min 15s
                updates.check_interval_seconds = interval;
            } else {
                return res.status(400).json({ error: 'Invalid check interval. Must be at least 15 seconds.' });
            }
        }
        
        if (Object.keys(updates).length === 1 && 'updated_at' in updates) {
             return res.status(400).json({ error: 'No update fields provided.' });
        }

        try {
            const [updatedEndpoint] = await this.db.update(monitored_endpoints)
                .set(updates)
                .where(and(
                    eq(monitored_endpoints.id, parseInt(endpointId)),
                    eq(monitored_endpoints.type, 'custom') // Ensure only custom endpoints are updated this way
                ))
                .returning();

            if (!updatedEndpoint) {
                return res.status(404).json({ error: 'Custom endpoint not found or not allowed to be updated.' });
            }
            res.status(200).json(updatedEndpoint);
        } catch (error) {
            if (error.message && error.message.includes('monitored_endpoints_url_unique')) {
                return res.status(409).json({ error: 'An endpoint with this URL already exists.' });
            }
            console.error('Error updating custom endpoint:', error);
            res.status(500).json({ error: 'Failed to update custom endpoint.' });
        }
    }

    async deleteCustomEndpoint(req, res) {
        const { endpointId } = req.params;
         if (isNaN(parseInt(endpointId))) {
            return res.status(400).json({ error: 'Invalid endpoint ID.'});
        }

        try {
            // Soft delete: mark as deleted
            const [deletedEndpoint] = await this.db.update(monitored_endpoints)
                .set({ is_deleted: true, updated_at: new Date() })
                .where(and(
                    eq(monitored_endpoints.id, parseInt(endpointId)),
                    eq(monitored_endpoints.type, 'custom')
                ))
                .returning();

            if (!deletedEndpoint) {
                return res.status(404).json({ error: 'Custom endpoint not found.' });
            }
            // Actual deletion of history might be a separate concern or handled by cascade if hard delete was used.
            // For soft delete, history remains.
            res.status(204).send();
        } catch (error) {
            console.error('Error deleting custom endpoint:', error);
            res.status(500).json({ error: 'Failed to delete custom endpoint.' });
        }
    }

    async listEndpoints(req, res) {
        try {
            const endpoints = await this.db.select()
                .from(monitored_endpoints)
                .where(eq(monitored_endpoints.is_deleted, false))
                .orderBy(desc(monitored_endpoints.created_at));

            const endpointsWithStatus = await Promise.all(
                endpoints.map(async (endpoint) => {
                    const [latestStatus] = await this.db.select()
                        .from(endpoint_status_history)
                        .where(eq(endpoint_status_history.endpoint_id, endpoint.id))
                        .orderBy(desc(endpoint_status_history.timestamp))
                        .limit(1);
                    return {
                        ...endpoint,
                        latest_status: latestStatus || null,
                    };
                })
            );
            res.status(200).json(endpointsWithStatus);
        } catch (error) {
            console.error('Error listing endpoints:', error);
            res.status(500).json({ error: 'Failed to list endpoints.' });
        }
    }

    async getEndpointHistory(req, res) {
        const { endpointId } = req.params;
        const { range, startDate, endDate } = req.query;
         if (isNaN(parseInt(endpointId))) {
            return res.status(400).json({ error: 'Invalid endpoint ID.'});
        }

        let startTime;
        const endTime = endDate ? new Date(endDate) : new Date();

        if (startDate) {
            startTime = new Date(startDate);
        } else {
            const rangeHours = parseInt(range?.replace('h', ''), 10) || 24; // Default to 24 hours
            startTime = new Date(endTime.getTime() - rangeHours * 60 * 60 * 1000);
        }

        try {
            const history = await this.db.select()
                .from(endpoint_status_history)
                .where(and(
                    eq(endpoint_status_history.endpoint_id, parseInt(endpointId)),
                    gte(endpoint_status_history.timestamp, startTime),
                    lte(endpoint_status_history.timestamp, endTime)
                ))
                .orderBy(asc(endpoint_status_history.timestamp)); // Changed to asc as per prompt
            
            res.status(200).json(history);
        } catch (error) {
            console.error('Error fetching endpoint history:', error);
            res.status(500).json({ error: 'Failed to fetch endpoint history.' });
        }
    }
}

module.exports = AppStatusController;
