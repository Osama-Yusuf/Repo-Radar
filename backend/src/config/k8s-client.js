const { KubeConfig, CoreV1Api } = require('@kubernetes/client-node');
const { db } = require('./drizzle-client'); // Import db
const { app_settings } = require('../schema/schema'); // Import app_settings
const { eq } = require('drizzle-orm'); // Import eq

/**
 * @description Creates and returns a Kubernetes CoreV1Api client.
 * It first attempts to load configuration from the local kubeconfig file.
 * If that fails, it attempts to load configuration from an in-cluster service account.
 * Logs the method used or errors encountered.
 * @returns {CoreV1Api} An instance of the Kubernetes CoreV1Api.
 */
function getK8sClient() {
  const kc = new KubeConfig();
  let client;

  try {
    console.log('Attempting to load Kubernetes config from default kubeconfig...');
    kc.loadFromDefault();
    console.log('Successfully loaded Kubernetes config from default kubeconfig.');
    client = kc.makeApiClient(CoreV1Api);
    return client;
  } catch (defaultError) {
    console.warn('Failed to load Kubernetes config from default kubeconfig:', defaultError.message);
    // Fallback to loading from in-cluster config
    try {
      console.log('Attempting to load Kubernetes config from cluster...');
      kc.loadFromCluster();
      console.log('Successfully loaded Kubernetes config from cluster.');
      client = kc.makeApiClient(CoreV1Api);
      return client;
    } catch (e) {
      console.error('Failed to load Kubernetes config from cluster:', e.message);
      console.error('Could not load Kubernetes configuration from default or cluster. Check your kubeconfig or ensure app is running in-cluster.');
      return null; // Return null instead of throwing an error, so the app can continue running
    }
  }
}

/**
 * @description Determines the target Kubernetes namespace.
 * Reads the K8S_TARGET_NAMESPACE environment variable.
 * If the variable is set and not empty, its value is returned.
 * Otherwise, 'default' is returned.
 * Logs the determined namespace.
 * @returns {string} The target Kubernetes namespace.
 */
async function getTargetNamespace() {
  // Try to get namespaces from DB first
  try {
    const settingsResult = await db.select({ kubernetes_namespaces: app_settings.kubernetes_namespaces })
      .from(app_settings)
      .where(eq(app_settings.id, 1));

    if (settingsResult.length > 0 && settingsResult[0].kubernetes_namespaces && settingsResult[0].kubernetes_namespaces.length > 0) {
      // For now, if multiple namespaces are configured, we'll log a warning and use the first one.
      // The ability to select a namespace or use all of them will be handled in specific API calls or UI.
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
    console.log(`Using target namespace from K8S_TARGET_NAMESPACE: ${namespaceFromEnv}`);
    return namespaceFromEnv.trim();
  }

  // Fallback to 'default' namespace
  console.log('K8S_TARGET_NAMESPACE not set or empty, and no valid namespace in DB settings. Using default namespace: "default"');
  return 'default';
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
  createMockK8sClient
};
