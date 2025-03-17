import {
  Timeline,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
} from '@mui/lab';
import { Paper, Typography, Box } from '@mui/material';
import {
  Commit as CommitIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

const TimelineList = ({ logs }) => {
  const getStatusColor = (status) => {
    if (status === 'changed') return '#4caf50';
    if (status === 'no_change') return '#9e9e9e';
    if (status?.startsWith('error')) return '#f44336';
    return '#2196f3';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Timeline position="right">
      {logs.map((log) => (
        <TimelineItem key={log.id}>
          <TimelineOppositeContent sx={{ flex: 0.2 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {formatDate(log.checked_at)}
            </Typography>
          </TimelineOppositeContent>
          <TimelineSeparator>
            <TimelineDot
              sx={{
                bgcolor: 'transparent',
                border: `2px solid ${getStatusColor(log.status)}`,
                boxShadow: `0 0 10px ${getStatusColor(log.status)}`,
                p: 1
              }}
            >
              {log.status === 'changed' ? (
                <CommitIcon sx={{ color: getStatusColor(log.status) }} />
              ) : log.status === 'no_change' ? (
                <CheckCircleIcon sx={{ color: getStatusColor(log.status) }} />
              ) : (
                <ErrorIcon sx={{ color: getStatusColor(log.status) }} />
              )}
            </TimelineDot>
            <TimelineConnector sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              width: '2px'
            }} />
          </TimelineSeparator>
          <TimelineContent>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.08)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff', mb: 1 }}>
                Branch: {log.branch_name}
              </Typography>
              {log.status === 'changed' ? (
                <>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mt: 1 }}>
                    New commit: <span style={{ color: '#2196f3' }}>{log.commit_sha?.substring(0, 7)}</span>
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#fff', mt: 1 }}>
                    {log.commit_message}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      by {log.commit_author}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      • {formatDate(log.commit_date)}
                    </Typography>
                  </Box>
                </>
              ) : log.status === 'no_change' ? (
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  No changes detected
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ color: '#ff4444' }}>
                  {log.status}
                </Typography>
              )}
            </Paper>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
};

export default TimelineList;
