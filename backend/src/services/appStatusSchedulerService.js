const { db } = require('../config/drizzle-client');
const { monitored_endpoints, endpoint_status_history } = require('../schema/schema');
const { checkUrl } = require('./healthCheckService');
const { runDiscoveryAndReconciliation } = require('./k8sDiscoveryService');
const { eq, and, or, lt, isNull, sql } = require('drizzle-orm');

const MAIN_SCHEDULER_INTERVAL_MS = 30 * 1000; // 30 seconds
const K8S_DISCOVERY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let mainSchedulerTimerId = null;
let k8sDiscoveryTimerId = null;

/**
 * Performs health checks for all active, due monitored endpoints.
 */
async function performChecks() {
    console.log('[AppStatusScheduler] Performing health checks for due endpoints...');
    try {
        const now = new Date();
        const endpointsToCheck = await db.select()
            .from(monitored_endpoints)
            .where(and(
                eq(monitored_endpoints.is_deleted, false),
                or(
                    isNull(monitored_endpoints.last_checked_at),
                    // Using sql directly for date arithmetic as Drizzle's type system can be tricky with intervals here
                    sql`${monitored_endpoints.last_checked_at} <= ${new Date(now.getTime() - monitored_endpoints.check_interval_seconds * 1000)}`
                )
            ));

        if (endpointsToCheck.length === 0) {
            console.log('[AppStatusScheduler] No endpoints due for a check.');
            return;
        }

        console.log(`[AppStatusScheduler] Found ${endpointsToCheck.length} endpoints due for a check.`);

        for (const endpoint of endpointsToCheck) {
            console.log(`[AppStatusScheduler] Checking endpoint: ${endpoint.name} (${endpoint.url})`);
            try {
                const checkResult = await checkUrl(endpoint.url);

                await db.insert(endpoint_status_history).values({
                    endpoint_id: endpoint.id,
                    timestamp: new Date(), // Record actual check time
                    status_code: checkResult.statusCode,
                    status_ok: checkResult.statusOk,
                    response_time_ms: checkResult.responseTimeMs,
                    error_message: checkResult.errorMessage,
                });

                await db.update(monitored_endpoints)
                    .set({ last_checked_at: new Date(), updated_at: new Date() })
                    .where(eq(monitored_endpoints.id, endpoint.id));
                
                console.log(`[AppStatusScheduler] Endpoint ${endpoint.name} check complete. Status OK: ${checkResult.statusOk}, Code: ${checkResult.statusCode}, Time: ${checkResult.responseTimeMs}ms`);

            } catch (error) {
                console.error(`[AppStatusScheduler] Error processing endpoint ${endpoint.name} (ID: ${endpoint.id}):`, error);
                // Optionally, insert a failure record into history or update last_checked_at to prevent immediate re-check of a failing endpoint
                try {
                    await db.insert(endpoint_status_history).values({
                        endpoint_id: endpoint.id,
                        timestamp: new Date(),
                        status_ok: false,
                        error_message: `Scheduler Error: ${error.message}`,
                    });
                     await db.update(monitored_endpoints)
                        .set({ last_checked_at: new Date(), updated_at: new Date() }) // Still update last_checked_at to avoid rapid retries on scheduler error
                        .where(eq(monitored_endpoints.id, endpoint.id));
                } catch (dbError) {
                    console.error(`[AppStatusScheduler] DB Error logging scheduler error for endpoint ${endpoint.id}:`, dbError);
                }
            }
        }
        console.log('[AppStatusScheduler] Finished checking due endpoints.');
    } catch (error) {
        console.error('[AppStatusScheduler] Error in performChecks main loop:', error);
    }
}

/**
 * Starts all schedulers for application status monitoring and K8s discovery.
 */
function startSchedulers() {
    console.log('[AppStatusScheduler] Starting schedulers...');

    // Main Check Scheduler
    console.log(`[AppStatusScheduler] Initializing main health check scheduler to run every ${MAIN_SCHEDULER_INTERVAL_MS / 1000} seconds.`);
    performChecks().catch(err => console.error("[AppStatusScheduler] Error during initial performChecks():", err)); // Initial run
    mainSchedulerTimerId = setInterval(() => {
        performChecks().catch(err => console.error("[AppStatusScheduler] Error during scheduled performChecks():", err));
    }, MAIN_SCHEDULER_INTERVAL_MS);
    console.log('[AppStatusScheduler] Main health check scheduler started.');

    // K8s Discovery Scheduler
    console.log(`[AppStatusScheduler] Initializing K8s discovery scheduler to run every ${K8S_DISCOVERY_INTERVAL_MS / 1000} seconds.`);
    runDiscoveryAndReconciliation().catch(err => console.error("[AppStatusScheduler] Error during initial runDiscoveryAndReconciliation():", err)); // Initial run
    k8sDiscoveryTimerId = setInterval(() => {
        runDiscoveryAndReconciliation().catch(err => console.error("[AppStatusScheduler] Error during scheduled runDiscoveryAndReconciliation():", err));
    }, K8S_DISCOVERY_INTERVAL_MS);
    console.log('[AppStatusScheduler] K8s discovery scheduler started.');
}

// Optional: Function to stop schedulers (useful for graceful shutdown or tests)
function stopSchedulers() {
    console.log('[AppStatusScheduler] Stopping schedulers...');
    if (mainSchedulerTimerId) {
        clearInterval(mainSchedulerTimerId);
        mainSchedulerTimerId = null;
        console.log('[AppStatusScheduler] Main health check scheduler stopped.');
    }
    if (k8sDiscoveryTimerId) {
        clearInterval(k8sDiscoveryTimerId);
        k8sDiscoveryTimerId = null;
        console.log('[AppStatusScheduler] K8s discovery scheduler stopped.');
    }
}

module.exports = {
    startSchedulers,
    performChecks, // Exporting for potential manual trigger or testing
    stopSchedulers // Exporting for graceful shutdown or testing
};
