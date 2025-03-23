const express = require('express');
const router = express.Router();
const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

// Create API clients
const k8sApi = kc.makeApiClient(k8s.CustomObjectsApi);
const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);

// Helper function to format duration
const formatDuration = (startTime, completionTime) => {
  if (!startTime) return '0s';
  
  const start = new Date(startTime);
  const end = completionTime ? new Date(completionTime) : new Date();
  const diffInSeconds = Math.floor((end - start) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}d`;
};

// Get pipeline runs in devops namespace
router.get('/pipelineruns', async (req, res) => {
  try {
    const response = await k8sApi.listNamespacedCustomObject(
      'tekton.dev',
      'v1beta1',
      'devops',
      'pipelineruns'
    );

    const pipelineRuns = (response.body.items || []).map(run => {
      const status = run.status || {};
      const conditions = status.conditions || [];
      const latestCondition = conditions[conditions.length - 1] || {};
      
      // Extract tasks from childReferences or taskRuns
      let tasks = [];
      if (status.childReferences) {
        tasks = status.childReferences.map(ref => ({
          name: ref.name,
          pipelineTaskName: ref.pipelineTaskName,
          status: ref.status || 'Unknown',
          startTime: ref.startTime,
          completionTime: ref.completionTime,
          duration: formatDuration(ref.startTime, ref.completionTime)
        }));
      } else if (status.taskRuns) {
        tasks = Object.entries(status.taskRuns).map(([key, task]) => {
          const startTime = task.status?.startTime;
          const completionTime = task.status?.completionTime;
          return {
            name: key,
            pipelineTaskName: task.pipelineTaskName,
            status: task.status?.conditions?.[0]?.reason || 'Unknown',
            startTime: startTime,
            completionTime: completionTime,
            duration: formatDuration(startTime, completionTime)
          };
        });
      }
      
      return {
        name: run.metadata.name,
        status: latestCondition.reason || 'Unknown',
        message: latestCondition.message || '',
        startTime: status.startTime,
        completionTime: status.completionTime,
        creationTime: run.metadata.creationTimestamp,
        duration: formatDuration(status.startTime, status.completionTime),
        pipeline: run.spec.pipelineRef?.name || 'Unknown',
        params: run.spec.params?.map(param => ({
          name: param.name,
          value: param.value
        })) || [],
        tasks
      };
    })
    // Sort by creation time, newest first
    .sort((a, b) => new Date(b.creationTime) - new Date(a.creationTime));

    res.json(pipelineRuns);
  } catch (error) {
    console.error('Error fetching pipeline runs:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline runs' });
  }
});

// Helper function to get pod logs
async function getPodLogs(podName, namespace, containerName) {
  try {
    const response = await coreV1Api.readNamespacedPodLog(
      podName,
      namespace,
      containerName
    );
    return response.body || '';
  } catch (err) {
    console.error(`Error fetching logs for container ${containerName}:`, err);
    return `Error fetching logs: ${err.message}`;
  }
}

// Get logs for a specific pipeline run task
router.get('/pipelineruns/:name/logs/:taskName', async (req, res) => {
  try {
    const { name, taskName } = req.params;

    // Get task runs for this pipeline
    const taskRuns = await k8sApi.listNamespacedCustomObject(
      'tekton.dev',
      'v1beta1',
      'devops',
      'taskruns'
    );

    // Find the specific task run
    const taskRun = taskRuns.body.items.find(tr => 
      tr.metadata.labels['tekton.dev/pipelineRun'] === name &&
      (tr.metadata.labels['tekton.dev/pipelineTask'] === taskName ||
       tr.metadata.name === taskName)
    );

    if (!taskRun) {
      return res.status(404).json({ error: 'Task run not found' });
    }

    // Get the pod for this task run
    const pods = await coreV1Api.listNamespacedPod(
      'devops',
      undefined,
      undefined,
      undefined,
      undefined,
      `tekton.dev/taskRun=${taskRun.metadata.name}`
    );

    if (!pods.body.items.length) {
      return res.status(404).json({ error: 'Pod not found for task run' });
    }

    const pod = pods.body.items[0];
    const containers = pod.spec.containers || [];
    let allLogs = '';

    // Get logs from each container sequentially
    for (const container of containers) {
      const logs = await getPodLogs(pod.metadata.name, 'devops', container.name);
      allLogs += `=== ${container.name} ===\n${logs}\n\n`;
    }

    res.json({ logs: allLogs || 'No logs available' });
  } catch (error) {
    console.error('Error fetching task logs:', error);
    res.status(500).json({ error: 'Failed to fetch task logs' });
  }
});

// Get logs for all tasks in a pipeline run
router.get('/pipelineruns/:name/logs', async (req, res) => {
  try {
    const { name } = req.params;

    // Get all task runs for this pipeline
    const taskRuns = await k8sApi.listNamespacedCustomObject(
      'tekton.dev',
      'v1beta1',
      'devops',
      'taskruns'
    );

    const pipelineTaskRuns = taskRuns.body.items.filter(tr => 
      tr.metadata.labels['tekton.dev/pipelineRun'] === name
    );

    if (!pipelineTaskRuns.length) {
      return res.status(404).json({ error: 'No tasks found for this pipeline run' });
    }

    const allTaskLogs = {};

    // Get logs for each task run
    for (const taskRun of pipelineTaskRuns) {
      const taskName = taskRun.metadata.labels['tekton.dev/pipelineTask'] || taskRun.metadata.name;

      // Get the pod for this task run
      const pods = await coreV1Api.listNamespacedPod(
        'devops',
        undefined,
        undefined,
        undefined,
        undefined,
        `tekton.dev/taskRun=${taskRun.metadata.name}`
      );

      if (pods.body.items.length > 0) {
        const pod = pods.body.items[0];
        const containers = pod.spec.containers || [];
        let taskLogs = '';

        // Get logs from each container sequentially
        for (const container of containers) {
          const logs = await getPodLogs(pod.metadata.name, 'devops', container.name);
          taskLogs += `=== ${container.name} ===\n${logs}\n\n`;
        }

        allTaskLogs[taskName] = taskLogs || 'No logs available';
      } else {
        allTaskLogs[taskName] = 'No pod found for this task';
      }
    }

    res.json({ logs: allTaskLogs });
  } catch (error) {
    console.error('Error fetching pipeline logs:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline logs' });
  }
});

module.exports = router;
