import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Terminal as LogsIcon,
  AccessTime as AccessTimeIcon,
  DoneAll as DoneAllIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import PipelineTaskList from './PipelineTaskList';
import { getPipelineStatus } from './pipelineUtils.jsx';

const PipelineCard = ({ pipeline, onOpenTaskLogs, onOpenPipelineLogs }) => {
  const statusInfo = getPipelineStatus(pipeline.status);

  return (
    <Paper sx={{
      p: 2.5,
      height: '100%',
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      border: `1px solid ${statusInfo.borderColor}`,
      transition: 'all 0.3s ease-in-out',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 8px 24px ${statusInfo.bgColor}`,
        background: 'rgba(255, 255, 255, 0.05)'
      }
    }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        mb: 2,
        pb: 2,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <Box sx={{ flex: 1, mr: 2 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              mb: 0.5,
              fontSize: '0.75rem'
            }}
          >
            PIPELINE NAME
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#fff',
              fontWeight: 500,
              wordBreak: 'break-word',
              fontSize: '0.9rem',
              mb: 1
            }}
          >
            {pipeline.name.split('-').slice(0, -1).join('-')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <AccessTimeIcon sx={{ fontSize: '1rem' }} />
              Created {new Date(pipeline.creationTime).toLocaleString()}
            </Typography>
            {pipeline.completionTime && (
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <DoneAllIcon sx={{ fontSize: '1rem' }} />
                Completed {new Date(pipeline.completionTime).toLocaleString()}
              </Typography>
            )}
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <TimerIcon sx={{ fontSize: '1rem' }} />
              Duration: {pipeline.duration && pipeline.duration !== '0s' ? pipeline.duration : pipeline.status === 'Running' ? 'In Progress' : 'N/A'}
            </Typography>
          </Box>
          {pipeline.message && (
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.75rem',
                display: 'block',
                mt: 0.5,
                fontStyle: 'italic'
              }}
            >
              {pipeline.message}
            </Typography>
          )}
        </Box>
        <Tooltip title="View All Task Logs">
          <IconButton
            size="small"
            onClick={() => onOpenPipelineLogs(pipeline)}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: '#fff',
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <LogsIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Box sx={{
          display: 'inline-flex',
          alignItems: 'center',
          px: 1.5,
          py: 0.75,
          borderRadius: '8px',
          backgroundColor: statusInfo.bgColor,
          border: `1px solid ${statusInfo.borderColor}`
        }}>
          <Box sx={{
            color: statusInfo.color,
            display: 'flex',
            alignItems: 'center'
          }}>
            {statusInfo.icon}
            <Typography sx={{ ml: 1, fontWeight: 500, fontSize: '0.85rem' }}>
              {pipeline.status}
            </Typography>
          </Box>
        </Box>
      </Box>
      <Grid item xs={12}>
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.5)',
            display: 'block',
            mb: 0.5
          }}
        >
          Pipeline
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: '#fff',
            fontWeight: 500,
            mb: 3
          }}
        >
          {pipeline.pipeline}
        </Typography>
      </Grid>

      {pipeline.params && pipeline.params.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              display: 'block',
              mb: 1
            }}
          >
            Parameters
          </Typography>
          <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1
          }}>
            {pipeline.params.map((param) => (
              <Box
                key={param.name}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  px: 1,
                  py: 0.5,
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                    borderColor: 'rgba(255, 255, 255, 0.2)'
                  }
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontWeight: 500,
                    fontSize: '0.75rem'
                  }}
                >
                  {param.name}:
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#fff',
                    ml: 0.5,
                    fontSize: '0.75rem'
                  }}
                >
                  {param.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <PipelineTaskList
            tasks={pipeline.tasks}
            pipeline={pipeline}
            onOpenTaskLogs={onOpenTaskLogs}
          />
        </Grid>
      </Grid>
    </Paper>
  );
};

export default PipelineCard;
