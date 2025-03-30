import React from 'react';
import {
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Pending as PendingIcon,
  PlayArrow as RunningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

// Helper function to get pipeline status style information
export const getPipelineStatus = (status) => {
  const statusMap = {
    succeeded: {
      color: '#4caf50',
      icon: <SuccessIcon />,
      bgColor: 'rgba(76, 175, 80, 0.1)',
      borderColor: 'rgba(76, 175, 80, 0.3)'
    },
    running: {
      color: '#2196f3',
      icon: <RunningIcon />,
      bgColor: 'rgba(33, 150, 243, 0.1)',
      borderColor: 'rgba(33, 150, 243, 0.3)'
    },
    failed: {
      color: '#ff5252',
      icon: <ErrorIcon />,
      bgColor: 'rgba(255, 82, 82, 0.1)',
      borderColor: 'rgba(255, 82, 82, 0.3)'
    },
    pending: {
      color: '#ffc107',
      icon: <PendingIcon />,
      bgColor: 'rgba(255, 193, 7, 0.1)',
      borderColor: 'rgba(255, 193, 7, 0.3)'
    },
    unknown: {
      color: '#757575',
      icon: <WarningIcon />,
      bgColor: 'rgba(117, 117, 117, 0.1)',
      borderColor: 'rgba(117, 117, 117, 0.3)'
    }
  };

  const normalizedStatus = status?.toLowerCase() || 'unknown';
  return statusMap[normalizedStatus] || statusMap.unknown;
};

// Helper function to sort pipelines based on selected sort option
export const sortPipelines = (pipelines, sortOption) => {
  const [field, order] = sortOption.split('-');
  return [...pipelines].sort((a, b) => {
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
          'Succeeded': 1,
          'Running': 2,
          'Unknown': 3,
          'Failed': 4
        };
        const statusA = statusOrder[a.status] || 999;
        const statusB = statusOrder[b.status] || 999;
        return order === 'desc'
          ? statusB - statusA
          : statusA - statusB;
      case 'duration':
        const getDurationInSeconds = (pipeline) => {
          if (!pipeline.duration) return 0;
          const durationMatch = pipeline.duration.match(/(\d+)([smhd])/);
          if (!durationMatch) return 0;
          
          const [, value, unit] = durationMatch;
          switch(unit) {
            case 's': return parseInt(value);
            case 'm': return parseInt(value) * 60;
            case 'h': return parseInt(value) * 3600;
            case 'd': return parseInt(value) * 86400;
            default: return 0;
          }
        };
        const durationA = getDurationInSeconds(a);
        const durationB = getDurationInSeconds(b);
        return order === 'desc'
          ? durationB - durationA
          : durationA - durationB;
      default:
        return 0;
    }
  });
};
