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
  // Debug the timestamp values
  // console.log(`Duration calculation - startTime: ${startTime}, completionTime: ${completionTime}`);
  
  if (!startTime) {
    // console.log('No startTime provided, returning 0s');
    return '0s';
  }
  
  try {
    const start = new Date(startTime);
    // Use current time if completionTime is null (for running tasks)
    const end = completionTime ? new Date(completionTime) : new Date();
    
    // console.log(`Parsed dates - start: ${start.toISOString()}, end: ${end.toISOString()}`);
    
    // Ensure both dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      // console.log('Invalid date conversion, returning 0s');
      return '0s';
    }
    
    // Calculate difference in milliseconds then convert to seconds
    const diffInMilliseconds = end - start;
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    
    // console.log(`Time difference: ${diffInMilliseconds}ms (${diffInSeconds}s)`);
    
    // Return at least 1s for very quick tasks to avoid showing 0s
    if (diffInSeconds <= 0) {
      // console.log('Time difference is zero or negative, returning 1s');
      return '1s';
    }

    // Format the duration
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  } catch (error) {
    console.error('Error calculating duration:', error);
    return '0s';
  }
};

// Get pipeline runs in devops namespace
router.get('/pipelineruns', async (req, res) => {
  try {
    // Fetch pipeline runs
    const response = await k8sApi.listNamespacedCustomObject(
      'tekton.dev',
      'v1beta1',
      'devops',
      'pipelineruns'
    );

    // Fetch all task runs for matching
    const taskRunsResponse = await k8sApi.listNamespacedCustomObject(
      'tekton.dev',
      'v1beta1',
      'devops',
      'taskruns'
    );
    
    // Create a map of task runs for easy lookup
    const taskRunsMap = {};
    if (taskRunsResponse.body && taskRunsResponse.body.items) {
      taskRunsResponse.body.items.forEach(tr => {
        taskRunsMap[tr.metadata.name] = tr;
      });
    }

    const pipelineRuns = (response.body.items || []).map(run => {
      const status = run.status || {};
      const conditions = status.conditions || [];
      const latestCondition = conditions[conditions.length - 1] || {};
      
      // console.log(`Pipeline: ${run.metadata.name}`);
      
      // Extract tasks from childReferences or taskRuns
      let tasks = [];
      if (status.childReferences) {
        tasks = status.childReferences.map(ref => {
          // console.log(`Task ref: ${ref.name}`);
          
          // Look up the actual TaskRun for timing data
          const taskRun = taskRunsMap[ref.name];
          let taskStartTime = null;
          let taskCompletionTime = null;
          
          if (taskRun) {
            // console.log(`Found TaskRun details for: ${ref.name}`);
            taskStartTime = taskRun.status?.startTime || null;
            taskCompletionTime = taskRun.status?.completionTime || null;
            
            // console.log(`TaskRun ${ref.name} time details - Start: ${taskStartTime}, Completion: ${taskCompletionTime}`);
          }
          
          return {
            name: ref.name,
            pipelineTaskName: ref.pipelineTaskName,
            status: taskRun?.status?.conditions?.[0]?.reason || ref.status || 'Unknown',
            startTime: taskStartTime,
            completionTime: taskCompletionTime,
            duration: formatDuration(taskStartTime, taskCompletionTime)
          };
        });
      } else if (status.taskRuns) {
        // console.log(`Using taskRuns property - structure: ${JSON.stringify(Object.keys(status.taskRuns))}`);
        
        tasks = Object.entries(status.taskRuns).map(([key, task]) => {
          // Access deeper into the nested structure to ensure we get timestamps
          const taskStatus = task.status || {};
          
          // Check if we need to go deeper for the timestamps
          let taskStartTime = null;
          let taskCompletionTime = null;
          
          if (taskStatus.startTime) {
            taskStartTime = taskStatus.startTime;
          } else if (task.startTime) {
            taskStartTime = task.startTime;
          }
          
          if (taskStatus.completionTime) {
            taskCompletionTime = taskStatus.completionTime;
          } else if (task.completionTime) {
            taskCompletionTime = task.completionTime;
          }
          
          // console.log(`Task: ${key}, StartTime: ${taskStartTime}, CompletionTime: ${taskCompletionTime}`);
          
          return {
            name: key,
            pipelineTaskName: task.pipelineTaskName,
            status: taskStatus.conditions?.[0]?.reason || 'Unknown',
            startTime: taskStartTime,
            completionTime: taskCompletionTime,
            duration: formatDuration(taskStartTime, taskCompletionTime)
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
