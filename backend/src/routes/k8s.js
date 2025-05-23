const express = require('express');
const router = express.Router();
const k8s = require('@kubernetes/client-node');
const util = require('util');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const appsV1Api = kc.makeApiClient(k8s.AppsV1Api); // Import AppsV1Api
const metricsApi = kc.makeApiClient(k8s.CustomObjectsApi);

// Helper function to format pod age
function formatAge(timestamp) {
  const now = new Date();
  const start = new Date(timestamp);
  const diffInSeconds = Math.floor((now - start) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

// Helper functions to convert metrics units
function convertCpuToMillicores(cpuString) {
  if (!cpuString) return '0m';
  
  // If already in millicores format, return as is
  if (cpuString.endsWith('m')) return cpuString;
  
  // Convert from nanocores (n) to millicores (m)
  if (cpuString.endsWith('n')) {
    const nanocores = parseInt(cpuString.replace('n', ''), 10);
    const millicores = Math.round(nanocores / 1000000); // 1m = 1,000,000n
    return `${millicores}m`;
  }
  
  // Handle core value (no suffix)
  const cores = parseFloat(cpuString);
  return `${Math.round(cores * 1000)}m`;
}

function convertMemoryToMi(memString) {
  if (!memString) return '0Mi';
  
  // If already in Mi format, return as is
  if (memString.endsWith('Mi')) return memString;
  
  // Convert from Ki to Mi
  if (memString.endsWith('Ki')) {
    const ki = parseInt(memString.replace('Ki', ''), 10);
    const mi = Math.round(ki / 1024);
    return `${mi}Mi`;
  }
  
  // Handle other formats
  if (memString.endsWith('Gi')) {
    const gi = parseFloat(memString.replace('Gi', ''));
    return `${Math.round(gi * 1024)}Mi`;
  }
  
  // Default case - assume bytes and convert to Mi
  const bytes = parseInt(memString, 10);
  const mi = Math.round(bytes / (1024 * 1024));
  return `${mi}Mi`;
}

async function getPodMetrics() {
  try {
    const metrics = new Map();
    const metricsResponse = await metricsApi.getNamespacedCustomObject(
      'metrics.k8s.io',
      'v1beta1',
      'default',
      'pods',
      ''
    );
    
    if (metricsResponse.body && metricsResponse.body.items) {
      metricsResponse.body.items.forEach(podMetric => {
        const podName = podMetric.metadata.name;
        const containers = {};
        
        if (podMetric.containers) {
          podMetric.containers.forEach(container => {
            containers[container.name] = {
              cpu: convertCpuToMillicores(container.usage.cpu),
              memory: convertMemoryToMi(container.usage.memory)
            };
          });
        }
        
        metrics.set(podName, containers);
      });
    }
    
    return metrics;
  } catch (error) {
    console.error('Error getting pod metrics:', error);
    return new Map();
  }
}

// Get pod status in default namespace
router.get('/pods', async (req, res) => {
  try {
    const response = await k8sApi.listNamespacedPod('default');
    const podMetrics = await getPodMetrics();

    const pods = response.body.items.map(pod => {
      const metrics = podMetrics.get(pod.metadata.name) || {};

      // Get the first container's image
      const image = pod.spec.containers[0]?.image || '';

      return {
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        status: pod.status.phase,
        creationTime: pod.metadata.creationTimestamp,
        containers: pod.spec.containers.map(container => ({
          name: container.name,
          image: container.image
        })),
        ready: `${pod.status.containerStatuses?.filter(c => c.ready).length || 0}/${pod.status.containerStatuses?.length || 0}`,
        restarts: pod.status.containerStatuses?.reduce((sum, c) => sum + (c.restartCount || 0), 0) || 0,
        age: formatAge(pod.metadata.creationTimestamp),
        image: image,
        resources: pod.spec.containers.map(container => {
          const containerMetrics = metrics[container.name] || {};
          return {
            name: container.name,
            limits: {
              cpu: container.resources?.limits?.cpu || 'N/A',
              memory: container.resources?.limits?.memory || 'N/A'
            },
            usage: {
              cpu: containerMetrics.cpu || '0m',
              memory: containerMetrics.memory || '0Mi'
            }
          };
        }),
        commit: pod.metadata.labels?.['commit'] || 'N/A',
        logs: null
      };
    });

    res.json(pods);
  } catch (error) {
    console.error('Error fetching pods:', error);
    res.status(500).json({ error: 'Failed to fetch pod status' });
  }
});

// Get deployments with image information
router.get('/deployments-with-images', async (req, res) => {
  try {
    const response = await appsV1Api.listNamespacedDeployment('default');
    const deployments = response.body.items.map(deployment => {
      const firstContainer = deployment.spec.template.spec.containers?.[0];
      const imageName = firstContainer?.image || null;

      return {
        deploymentName: deployment.metadata.name,
        namespace: deployment.metadata.namespace,
        replicas: deployment.spec.replicas,
        availableReplicas: deployment.status.availableReplicas || 0, // Ensure a default value if undefined
        imageName: imageName,
      };
    });
    res.json(deployments);
  } catch (error) {
    console.error('Error fetching deployments:', error);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
});

// Get logs for a specific pod
router.get('/pods/:name/logs', async (req, res) => {
  try {
    const response = await k8sApi.readNamespacedPodLog(
      req.params.name,
      'default',
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      1000 // Limit to last 1000 lines
    );
    
    // Handle the response correctly - it's already a string
    res.json({ logs: response.body || 'No logs available' });
  } catch (error) {
    console.error('Error fetching pod logs:', error);
    res.status(500).json({ error: 'Failed to fetch pod logs' });
  }
});

module.exports = router;
