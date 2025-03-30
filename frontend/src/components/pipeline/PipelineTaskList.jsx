import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { 
  Terminal as LogsIcon,
  Timer as TimerIcon 
} from '@mui/icons-material';
import { getPipelineStatus } from './pipelineUtils.jsx';

const PipelineTaskList = ({ tasks, pipeline, onOpenTaskLogs }) => {
  return (
    <>
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255, 255, 255, 0.5)',
          display: 'block',
          mb: 1
        }}
      >
        Tasks
      </Typography>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 1,
        maxHeight: '220px',
        overflowY: 'auto',
        pr: 1,
        mr: -1,
        '&::-webkit-scrollbar': {
          width: '6px',
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255, 255, 255, 0.15)',
          borderRadius: '6px',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.3)',
          },
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '6px',
        },
        maskImage: 'linear-gradient(to bottom, black 95%, transparent 100%)',
      }}>
        {[...tasks].reverse().map((task, index) => {
          const taskStatus = getPipelineStatus(task.status);
          return (
            <Box
              key={task.name}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                borderRadius: '8px',
                backgroundColor: taskStatus.bgColor,
                border: `1px solid ${taskStatus.borderColor}`,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateX(4px)',
                  backgroundColor: `${taskStatus.bgColor}`,
                  boxShadow: `0 4px 12px ${taskStatus.borderColor}`,
                  borderColor: taskStatus.color
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: taskStatus.color,
                    minWidth: '24px',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}
                >
                  {tasks.length - index}.
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#fff',
                    fontWeight: 500,
                    fontSize: '0.9rem'
                  }}
                >
                  {task.pipelineTaskName || task.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <TimerIcon sx={{ fontSize: '0.9rem' }} />
                  {task.duration || '0s'}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onOpenTaskLogs(pipeline, task)}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&:hover': {
                      color: '#fff',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <LogsIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          );
        })}
      </Box>
    </>
  );
};

export default PipelineTaskList;
