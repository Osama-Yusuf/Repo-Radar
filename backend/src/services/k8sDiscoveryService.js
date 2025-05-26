const { getK8sClient, getTargetNamespace } = require('../config/k8s-client');
const { NetworkingV1Api } = require('@kubernetes/client-node');
const { db } = require('../config/drizzle-client');
const { monitored_endpoints } = require('../schema/schema');
const { eq, and, or, notInArray, sql } = require('drizzle-orm');

/**
 * Discovers potential monitoring endpoints from Kubernetes Ingress resources.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of discovered endpoint objects.
 */
async function discoverIngressEndpoints() {
    const k8sNetworkingV1Api = getK8sClient()?.makeApiClient(NetworkingV1Api);
    if (!k8sNetworkingV1Api) {
        console.error('[K8sDiscoveryService] Kubernetes client not available. Skipping Ingress discovery.');
        return [];
    }

    const namespaces = await getTargetNamespace(true); // Get all configured namespaces
    if (!namespaces || namespaces.length === 0) {
        console.log('[K8sDiscoveryService] No target namespaces configured or found. Skipping Ingress discovery.');
        return [];
    }

    const discoveredEndpoints = [];
    console.log(`[K8sDiscoveryService] Starting Ingress discovery in namespaces: ${namespaces.join(', ')}`);

    for (const namespace of namespaces) {
        try {
            console.log(`[K8sDiscoveryService] Fetching Ingresses for namespace: ${namespace}`);
            const res = await k8sNetworkingV1Api.listNamespacedIngress(namespace);
            
            if (!res || !res.body || !res.body.items) {
                console.warn(`[K8sDiscoveryService] No Ingress items found or invalid response for namespace: ${namespace}`);
                continue;
            }

            for (const ingress of res.body.items) {
                if (!ingress.metadata || !ingress.spec || !ingress.spec.rules) {
                    console.warn(`[K8sDiscoveryService] Ingress ${ingress.metadata?.name || 'unknown'} in ${namespace} is missing metadata or spec.rules.`);
                    continue;
                }

                for (const rule of ingress.spec.rules) {
                    if (!rule.host || !rule.http || !rule.http.paths) {
                        continue;
                    }
                    const host = rule.host;

                    for (const pathObj of rule.http.paths) {
                        let path = pathObj.path || '/';
                        if (path !== '/' && path.endsWith('/')) { // Avoid double slashes if path is not root
                            path = path.slice(0, -1);
                        }
                        if (!path.startsWith('/')) {
                            path = '/' + path;
                        }
                        
                        let protocol = 'http';
                        if (ingress.spec.tls) {
                            for (const tls of ingress.spec.tls) {
                                if (tls.hosts && tls.hosts.includes(host)) {
                                    protocol = 'https';
                                    break;
                                }
                            }
                        }
                        
                        const constructedUrl = `${protocol}://${host}${path}`;
                        const endpointName = `${ingress.metadata.name}-${host}${path === '/' ? '' : path.replace(/\//g, '-')}`;

                        discoveredEndpoints.push({
                            name: endpointName,
                            url: constructedUrl,
                            type: 'auto-discovered',
                            source_namespace: namespace,
                            source_resource_name: ingress.metadata.name,
                            source_resource_kind: 'Ingress',
                            check_interval_seconds: 60 // Default interval
                        });
                    }
                }
            }
            console.log(`[K8sDiscoveryService] Found ${discoveredEndpoints.length} potential endpoints in namespace ${namespace} so far.`);
        } catch (error) {
            console.error(`[K8sDiscoveryService] Error discovering Ingresses in namespace ${namespace}:`, error.body?.message || error.message);
        }
    }
    console.log(`[K8sDiscoveryService] Total discovered Ingress endpoints: ${discoveredEndpoints.length}`);
    return discoveredEndpoints;
}

/**
 * Reconciles discovered endpoints with those in the database.
 * @param {Array<Object>} discoveredEndpoints - Array of endpoints discovered from Kubernetes.
 */
async function reconcileEndpoints(discoveredEndpoints) {
    console.log('[K8sDiscoveryService] Starting endpoint reconciliation...');
    const existingDbEndpoints = await db.select()
        .from(monitored_endpoints)
        .where(and(
            eq(monitored_endpoints.type, 'auto-discovered')
            // We fetch all, including those marked is_deleted, to handle re-activation
        ));

    const discoveredUrls = discoveredEndpoints.map(e => e.url);
    const existingActiveDbUrls = existingDbEndpoints.filter(e => !e.is_deleted).map(e => e.url);
    
    let newEndpointsAdded = 0;
    let endpointsMarkedDeleted = 0;
    let endpointsReactivated = 0;

    // 1. Add new endpoints
    const endpointsToAdd = discoveredEndpoints.filter(de => !existingActiveDbUrls.includes(de.url));
    for (const epToAdd of endpointsToAdd) {
        const existingPossiblyDeleted = existingDbEndpoints.find(ede => ede.url === epToAdd.url);
        if (existingPossiblyDeleted && existingPossiblyDeleted.is_deleted) {
            // This endpoint exists but was marked deleted, so reactivate it (handled in step 3)
            continue;
        }
        if (!existingPossiblyDeleted) { // Only add if truly new
            try {
                await db.insert(monitored_endpoints).values(epToAdd);
                newEndpointsAdded++;
                console.log(`[K8sDiscoveryService] Added new endpoint: ${epToAdd.name} (${epToAdd.url})`);
            } catch (error) {
                 // Handle potential unique constraint violation if URL somehow exists (e.g. as 'custom' type)
                if (error.message && error.message.includes('duplicate key value violates unique constraint "monitored_endpoints_url_unique"')) {
                    console.warn(`[K8sDiscoveryService] Endpoint URL ${epToAdd.url} already exists (possibly as a custom type or race condition). Skipping addition.`);
                } else {
                    console.error(`[K8sDiscoveryService] Error adding new endpoint ${epToAdd.url}:`, error);
                }
            }
        }
    }

    // 2. Mark missing endpoints as deleted (soft delete)
    const urlsToMarkDeleted = [];
    for (const dbEp of existingDbEndpoints) {
        if (dbEp.type === 'auto-discovered' && !dbEp.is_deleted && !discoveredUrls.includes(dbEp.url)) {
            urlsToMarkDeleted.push(dbEp.url);
        }
    }
    if (urlsToMarkDeleted.length > 0) {
        await db.update(monitored_endpoints)
            .set({ is_deleted: true, updated_at: new Date() })
            .where(and(
                eq(monitored_endpoints.type, 'auto-discovered'),
                notInArray(monitored_endpoints.url, discoveredUrls) // Double check condition from original logic. More direct: inArray(monitored_endpoints.url, urlsToMarkDeleted)
            ));
        endpointsMarkedDeleted = urlsToMarkDeleted.length; // This count might be slightly off if using notInArray like this.
                                                       // A more accurate way: count based on actual update result or use the length of urlsToMarkDeleted
        console.log(`[K8sDiscoveryService] Marked ${endpointsMarkedDeleted} endpoints as deleted: ${urlsToMarkDeleted.join(', ')}`);
    }
    
    // 3. Reactivate endpoints that were previously marked as deleted but are now re-discovered
    const endpointsToReactivate = [];
    for (const de of discoveredEndpoints) {
        const existingDeleted = existingDbEndpoints.find(ede => ede.url === de.url && ede.is_deleted);
        if (existingDeleted) {
            endpointsToReactivate.push({
                id: existingDeleted.id,
                name: de.name, // Update name in case it changed (e.g. Ingress metadata rename)
                source_namespace: de.source_namespace,
                source_resource_name: de.source_resource_name,
                source_resource_kind: de.source_resource_kind,
            });
        }
    }

    for (const epToReactivate of endpointsToReactivate) {
        await db.update(monitored_endpoints)
            .set({ 
                is_deleted: false, 
                name: epToReactivate.name,
                source_namespace: epToReactivate.source_namespace,
                source_resource_name: epToReactivate.source_resource_name,
                source_resource_kind: epToReactivate.source_resource_kind,
                updated_at: new Date() 
            })
            .where(eq(monitored_endpoints.id, epToReactivate.id));
        endpointsReactivated++;
        console.log(`[K8sDiscoveryService] Reactivated endpoint: ${epToReactivate.name} (ID: ${epToReactivate.id})`);
    }

    console.log(`[K8sDiscoveryService] Reconciliation complete. New: ${newEndpointsAdded}, Deleted: ${endpointsMarkedDeleted}, Reactivated: ${endpointsReactivated}.`);
}


/**
 * Runs the full discovery and reconciliation process.
 */
async function runDiscoveryAndReconciliation() {
    console.log('[K8sDiscoveryService] Starting Kubernetes Ingress discovery and endpoint reconciliation cycle...');
    try {
        const discoveredEndpoints = await discoverIngressEndpoints();
        if (discoveredEndpoints && discoveredEndpoints.length > 0) {
            await reconcileEndpoints(discoveredEndpoints);
        } else if (discoveredEndpoints) { // Array exists but is empty
             console.log('[K8sDiscoveryService] No Ingress endpoints discovered. Attempting reconciliation for potential deletions.');
             await reconcileEndpoints([]); // Pass empty array to mark all auto-discovered as deleted if not found
        } else {
            console.log('[K8sDiscoveryService] Ingress discovery did not return a valid list. Skipping reconciliation.');
        }
    } catch (error) {
        console.error('[K8sDiscoveryService] Error in discovery and reconciliation cycle:', error);
    }
}

module.exports = {
    discoverIngressEndpoints,
    reconcileEndpoints,
    runDiscoveryAndReconciliation
};
