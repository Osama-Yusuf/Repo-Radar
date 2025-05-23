const { KubeConfig, CoreV1Api } = require('@kubernetes/client-node');

/**
 * @description Creates and returns a Kubernetes CoreV1Api client.
 * It first attempts to load configuration from an in-cluster service account.
 * If that fails, it attempts to load configuration from the local kubeconfig file.
 * Logs the method used or errors encountered.
 * @returns {CoreV1Api} An instance of the Kubernetes CoreV1Api.
 * @throws {Error} If both in-cluster and default configuration loading fail.
 */
function getK8sClient() {
  const kc = new KubeConfig();
  let client;

  try {
    console.log('Attempting to load Kubernetes config from cluster...');
    kc.loadFromCluster();
    console.log('Successfully loaded Kubernetes config from cluster.');
    client = kc.makeApiClient(CoreV1Api);
    return client;
  } catch (e) {
    console.warn('Failed to load Kubernetes config from cluster:', e.message);
    // Fallback to loading from default kubeconfig
    try {
      console.log('Attempting to load Kubernetes config from default kubeconfig...');
      kc.loadFromDefault();
      console.log('Successfully loaded Kubernetes config from default kubeconfig.');
      client = kc.makeApiClient(CoreV1Api);
      return client;
    } catch (defaultError) {
      console.error('Failed to load Kubernetes config from default kubeconfig:', defaultError.message);
      throw new Error('Could not load Kubernetes configuration from cluster or default. Ensure KUBECONFIG is set or app is running in-cluster.');
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
function getTargetNamespace() {
  const namespaceFromEnv = process.env.K8S_TARGET_NAMESPACE;
  if (namespaceFromEnv && namespaceFromEnv.trim() !== '') {
    console.log(`Using target namespace from K8S_TARGET_NAMESPACE: ${namespaceFromEnv}`);
    return namespaceFromEnv.trim();
  }
  console.log('K8S_TARGET_NAMESPACE not set or empty, using default namespace: "default"');
  return 'default';
}

module.exports = {
  getK8sClient,
  getTargetNamespace,
};
