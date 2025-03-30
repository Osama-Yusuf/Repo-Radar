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
  AccessTime,
  GitHub,
  Memory as MemoryIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { getPodStatus } from './podUtils';

const PodCard = ({ pod, onOpenLogs }) => {
  const statusInfo = getPodStatus(pod);

  return (
    <Paper sx={{
      p: 2.6,
      height: '100%',
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      width: '88%',
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
        <Box sx={{ flex: 1, mr: 2, width: '100%', overflow: 'hidden' }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              mb: 0.5,
              fontSize: '0.75rem'
            }}
          >
            POD NAME
          </Typography>
          <Tooltip title={pod.name} placement="top" arrow>
            <Typography
              variant="body1"
              sx={{
                color: '#fff',
                fontWeight: 500,
                fontSize: '0.9rem',
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%'
              }}
            >
              {pod.name}
            </Typography>
          </Tooltip>
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
              <AccessTime sx={{ fontSize: '1rem' }} />
              Created {new Date(pod.creationTime).toLocaleString()}
            </Typography>
          </Box>
        </Box>
        <Tooltip title="View Logs">
          <IconButton
            size="small"
            onClick={() => onOpenLogs(pod)}
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': { color: '#fff', background: 'rgba(255, 255, 255, 0.1)' }
            }}
          >
            <LogsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ mb: 2.5, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'space-between' }}>
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
              {statusInfo.status || pod.status}
            </Typography>
          </Box>
        </Box>

        {pod.commit && pod.commit !== 'N/A' && (
          <Tooltip title="Latest deployed commit hash" placement="top" arrow>
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1.5,
                py: 0.75,
                borderRadius: '6px',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(33, 150, 243, 0.2)',
                color: '#2196f3',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                letterSpacing: '0.5px',
                fontWeight: 500,
                cursor: 'default',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'rgba(33, 150, 243, 0.15)',
                  borderColor: 'rgba(33, 150, 243, 0.3)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              <GitHub sx={{ fontSize: '1rem', mr: 0.5, opacity: 0.7 }} />
              <Typography component="span" sx={{ opacity: 0.7, mr: 0.5, fontSize: '0.8rem' }}>
                commit
              </Typography>
              {pod.commit}
            </Box>
          </Tooltip>
        )}
        
        {pod.image && (!pod.commit || pod.commit === 'N/A') && (() => {
          const match = pod.image.match(/:([a-f0-9]{7})--/);
          if (match) {
            return (
              <Tooltip title="Latest deployed commit hash" placement="top" arrow>
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: '6px',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    border: '1px solid rgba(33, 150, 243, 0.2)',
                    color: '#2196f3',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    letterSpacing: '0.5px',
                    fontWeight: 500,
                    cursor: 'default',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: 'rgba(33, 150, 243, 0.15)',
                      borderColor: 'rgba(33, 150, 243, 0.3)',
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  <GitHub sx={{ fontSize: '1rem', mr: 0.5, opacity: 0.7 }} />
                  <Typography component="span" sx={{ opacity: 0.7, mr: 0.5, fontSize: '0.8rem' }}>
                    commit
                  </Typography>
                  {match[1]}
                </Box>
              </Tooltip>
            );
          }
          return null;
        })()}
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={4} sx={{ textAlign: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              display: 'block'
            }}
          >
            Ready
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#fff',
              fontWeight: 500
            }}
          >
            {pod.ready}
          </Typography>
        </Grid>
        <Grid item xs={4} sx={{ textAlign: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              display: 'block',
              mb: 0.5
            }}
          >
            Restarts
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              color: pod.restarts > 0 ? '#ff9800' : '#fff'
            }}
          >
            {pod.restarts}
          </Typography>
        </Grid>
        <Grid item xs={4} sx={{ textAlign: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              display: 'block',
              mb: 0.5
            }}
          >
            Age
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#fff',
              fontWeight: 500,
              mb: 1
            }}
          >
            {pod.age}
          </Typography>
        </Grid>
        
        {pod.resources && pod.resources.length > 0 && (
          <Grid item xs={12} sx={{ 
            mt: 2, 
            pt: 2,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)' 
          }}>
            {pod.resources.map((container, index) => (
              <Box
                key={container.name}
                sx={{
                  mb: index !== pod.resources.length - 1 ? 2 : 0,
                  pb: index !== pod.resources.length - 1 ? 2 : 0,
                  borderBottom: index !== pod.resources.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                }}
              >
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', mt: 1 }}>
                  <Tooltip title="CPU Usage/Limit" placement="top" arrow>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: '8px',
                        bgcolor: 'rgba(33, 150, 243, 0.1)',
                        border: '1px solid rgba(33, 150, 243, 0.2)'
                      }}
                    >
                      <SpeedIcon sx={{
                        color: '#2196f3',
                        fontSize: '1.2rem'
                      }} />
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#2196f3',
                          fontWeight: 500,
                          fontSize: '0.85rem'
                        }}
                      >
                        {`${container.usage.cpu}/${container.limits.cpu}`}
                      </Typography>
                    </Box>
                  </Tooltip>
                  <Tooltip title="Memory Usage/Limit" placement="top" arrow>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: '8px',
                        bgcolor: 'rgba(156, 39, 176, 0.1)',
                        border: '1px solid rgba(156, 39, 176, 0.2)'
                      }}
                    >
                      <MemoryIcon sx={{
                        color: '#9c27b0',
                        fontSize: '1.2rem'
                      }} />
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#9c27b0',
                          fontWeight: 500,
                          fontSize: '0.85rem'
                        }}
                      >
                        {`${container.usage.memory}/${container.limits.memory}`}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default PodCard;
