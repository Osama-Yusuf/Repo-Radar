const { KubeConfig, CoreV1Api, NetworkingV1Api } = require('@kubernetes/client-node');
const { db } = require('./drizzle-client'); // Import db
const { app_settings } = require('../schema/schema'); // Import app_settings
const { eq } = require('drizzle-orm'); // Import eq

/**
 * @description Creates and returns a Kubernetes KubeConfig object.
 * It first attempts to load configuration from the local kubeconfig file.
 * If that fails, it attempts to load configuration from an in-cluster service account.
 * Logs the method used or errors encountered.
 * @returns {KubeConfig|null} An instance of the Kubernetes KubeConfig or null if configuration fails.
 */
function getK8sConfig() {
  const kc = new KubeConfig();

  try {
    console.log('Attempting to load Kubernetes config from default kubeconfig...');
    kc.loadFromDefault();
    console.log('Successfully loaded Kubernetes config from default kubeconfig.');
    return kc;
  } catch (defaultError) {
    console.warn('Failed to load Kubernetes config from default kubeconfig:', defaultError.message);
    // Fallback to loading from in-cluster config
    try {
      console.log('Attempting to load Kubernetes config from cluster...');
      kc.loadFromCluster();
      console.log('Successfully loaded Kubernetes config from cluster.');
      return kc;
    } catch (e) {
      console.error('Failed to load Kubernetes config from cluster:', e.message);
      console.error('Could not load Kubernetes configuration from default or cluster. Check your kubeconfig or ensure app is running in-cluster.');
      return null; // Return null instead of throwing an error, so the app can continue running
    }
  }
}

/**
 * @description Creates and returns a Kubernetes CoreV1Api client.
 * @returns {CoreV1Api|null} An instance of the Kubernetes CoreV1Api or null if configuration fails.
 */
function getK8sClient() {
  const kc = getK8sConfig();
  if (!kc) return null;

  return kc.makeApiClient(CoreV1Api);
}

/**
 * @description Determines the target Kubernetes namespace(s).
 * First tries to get namespaces from the database settings.
 * If that fails, falls back to the K8S_TARGET_NAMESPACE environment variable.
 * If that's not set, falls back to the 'default' namespace.
 * @param {boolean} [returnAll=false] - If true, returns all configured namespaces as an array
 * @returns {Promise<string|string[]>} The target Kubernetes namespace(s)
 */
async function getTargetNamespace(returnAll = false) {
  // Try to get namespaces from DB first
  try {
    const settingsResult = await db.select({ kubernetes_namespaces: app_settings.kubernetes_namespaces })
      .from(app_settings)
      .where(eq(app_settings.id, 1));

    if (settingsResult.length > 0 && settingsResult[0].kubernetes_namespaces && settingsResult[0].kubernetes_namespaces.length > 0) {
      // If returnAll is true, return all configured namespaces
      if (returnAll) {
        console.log(`Using all target namespaces from DB settings: ${settingsResult[0].kubernetes_namespaces.join(', ')}`);
        return settingsResult[0].kubernetes_namespaces;
      }

      // For backward compatibility, return just the first namespace
      if (settingsResult[0].kubernetes_namespaces.length > 1) {
        console.warn(`Multiple Kubernetes namespaces configured in settings: ${settingsResult[0].kubernetes_namespaces.join(', ')}. Using the first one: ${settingsResult[0].kubernetes_namespaces[0]}`);
      }
      console.log(`Using target namespace from DB settings: ${settingsResult[0].kubernetes_namespaces[0]}`);
      return settingsResult[0].kubernetes_namespaces[0];
    }
  } catch (dbError) {
    console.error('Failed to fetch Kubernetes namespaces from database:', dbError);
    // Proceed to fallback mechanisms if DB fetch fails
  }

  // Fallback to environment variable
  const namespaceFromEnv = process.env.K8S_TARGET_NAMESPACE;
  if (namespaceFromEnv && namespaceFromEnv.trim() !== '') {
    // If returnAll is true and env var contains comma-separated values, split them
    if (returnAll && namespaceFromEnv.includes(',')) {
      const namespaces = namespaceFromEnv.split(',').map(ns => ns.trim()).filter(ns => ns);
      console.log(`Using all target namespaces from K8S_TARGET_NAMESPACE: ${namespaces.join(', ')}`);
      return namespaces;
    }

    console.log(`Using target namespace from K8S_TARGET_NAMESPACE: ${namespaceFromEnv}`);
    return returnAll ? [namespaceFromEnv.trim()] : namespaceFromEnv.trim();
  }

  // Fallback to 'default' namespace
  console.log('K8S_TARGET_NAMESPACE not set or empty, and no valid namespace in DB settings. Using default namespace: "default"');
  return returnAll ? ['default'] : 'default';
}

/**
 * @description Creates and returns a Kubernetes NetworkingV1Api client.
 * @returns {NetworkingV1Api|null} An instance of the Kubernetes NetworkingV1Api or null if configuration fails.
 */
function getK8sNetworkingClient() {
  const kc = getK8sConfig();
  if (!kc) return null;

  return kc.makeApiClient(NetworkingV1Api);
}

/**
 * Creates a mock Kubernetes client for development environments
 * @returns {Object} A mock K8s client with basic functionality
 */
function createMockK8sClient() {
  return {
    listNamespacedPod: async () => {
      console.log('[MOCK K8S] Returning empty pod list');
      return {
        body: {
          items: []
        }
      };
    },
    // Add other methods as needed for your application
  };
}

module.exports = {
  getK8sClient,
  getTargetNamespace,
  getK8sNetworkingClient,
  createMockK8sClient
};
