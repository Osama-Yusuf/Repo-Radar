const express = require('express');
const router = express.Router();
const k8s = require('@kubernetes/client-node');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

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

async function getPodMetrics() {
  try {
    const { stdout } = await execPromise('kubectl top pods --namespace default --containers');
    const lines = stdout.trim().split('\n').slice(1); // Skip header
    const metrics = new Map();

    lines.forEach(line => {
      const [pod, container, cpu, memory] = line.split(/\s+/);
      if (!metrics.has(pod)) {
        metrics.set(pod, {});
      }
      metrics.get(pod)[container] = {
        cpu,
        memory
      };
    });

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
