import React from 'react';
import {
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Pending as PendingIcon,
  PlayArrow as RunningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// Helper function to get pod status style information
export const getPodStatus = (pod) => {
  // Check for CrashLoopBackOff
  if (pod.restarts > 5) {
    return {
      status: 'CrashLoopBackOff',
      color: '#ff5252',
      icon: <RunningIcon />,
      bgColor: 'rgba(255, 82, 82, 0.1)',
      borderColor: 'rgba(255, 82, 82, 0.3)'
    };
  }

  // Check container statuses
  const containerStatuses = pod.containerStatuses || [];
  const hasFailedContainer = containerStatuses.some(
    status => status.state?.waiting?.reason === 'CrashLoopBackOff' ||
      status.state?.waiting?.reason === 'Error'
  );

  if (hasFailedContainer) {
    return {
      status: 'Failed',
      color: '#ff5252',
      icon: <ErrorIcon />,
      bgColor: 'rgba(255, 82, 82, 0.1)',
      borderColor: 'rgba(255, 82, 82, 0.3)'
    };
  }

  const statusMap = {
    running: {
      color: '#4caf50',
      icon: <SuccessIcon />,
      bgColor: 'rgba(76, 175, 80, 0.1)',
      borderColor: 'rgba(76, 175, 80, 0.3)'
    },
    pending: {
      color: '#ffc107',
      icon: <PendingIcon />,
      bgColor: 'rgba(255, 193, 7, 0.1)',
      borderColor: 'rgba(255, 193, 7, 0.3)'
    },
    failed: {
      color: '#ff5252',
      icon: <ErrorIcon />,
      bgColor: 'rgba(255, 82, 82, 0.1)',
      borderColor: 'rgba(255, 82, 82, 0.3)'
    },
    succeeded: {
      color: '#2196f3',
      icon: <SuccessIcon />,
      bgColor: 'rgba(33, 150, 243, 0.1)',
      borderColor: 'rgba(33, 150, 243, 0.3)'
    },
    unknown: {
      color: '#757575',
      icon: <WarningIcon />,
      bgColor: 'rgba(117, 117, 117, 0.1)',
      borderColor: 'rgba(117, 117, 117, 0.3)'
    }
  };

  return statusMap[pod.status.toLowerCase()] || statusMap.unknown;
};

// Helper function to sort pods based on selected sort option
export const sortPods = (pods, sortOption) => {
  const [field, order] = sortOption.split('-');
  return [...pods].sort((a, b) => {
    switch (field) {
      case 'creationTime':
        return order === 'desc'
          ? new Date(b.creationTime) - new Date(a.creationTime)
          : new Date(a.creationTime) - new Date(b.creationTime);
      case 'name':
        return order === 'desc'
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name);
      case 'status':
        const statusOrder = {
          'Running': 1,
          'Pending': 2,
          'Succeeded': 3,
          'Failed': 4,
          'Unknown': 5,
          'CrashLoopBackOff': 6
        };
        const statusA = statusOrder[a.status] || 999;
        const statusB = statusOrder[b.status] || 999;
        return order === 'desc'
          ? statusB - statusA
          : statusA - statusB;
      case 'restarts':
        return order === 'desc'
          ? b.restarts - a.restarts
          : a.restarts - b.restarts;
      default:
        return 0;
    }
  });
};
