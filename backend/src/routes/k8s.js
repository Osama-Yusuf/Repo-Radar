const express = require('express');
const router = express.Router();
const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

// Helper function to format pod age
const formatAge = (startTime) => {
  const now = new Date();
  const start = new Date(startTime);
  const diffInSeconds = Math.floor((now - start) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

// Get pod status in default namespace
router.get('/pods', async (req, res) => {
  try {
    const response = await k8sApi.listNamespacedPod('default');
    const pods = response.body.items.map(pod => ({
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      status: pod.status.phase,
      creationTime: pod.metadata.creationTimestamp,
      containers: pod.spec.containers.map(container => ({
        name: container.name,
        image: container.image
      })),
      ready: `${pod.status.containerStatuses.filter(c => c.ready).length}/${pod.status.containerStatuses.length}`,
      restarts: pod.status.containerStatuses.reduce((sum, c) => sum + (c.restartCount || 0), 0),
      age: formatAge(pod.metadata.creationTimestamp),
      logs: null
    }));

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
