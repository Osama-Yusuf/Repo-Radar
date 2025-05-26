import React from 'react';
import { Grid, Box, Typography, CircularProgress } from '@mui/material';
import PodCard from './PodCard';
import PodSortSelect from './PodSortSelect';
import EmptyState from './EmptyState';
import { sortPods } from './podUtils';

const PodList = ({
  pods,
  loading,
  searchTerm,
  sortOption,
  setSortOption,
  onOpenPodLogs,
  onRefresh
}) => {
  // Filter pods based on search term
  const filteredPods = pods.filter(pod =>
    pod.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort filtered pods
  const sortedPods = sortPods(filteredPods, sortOption);

  return (
    <Box>
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', sm: 'center' },
        mb: 6,
        gap: 2
      }}>


        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          width: { xs: '100%', sm: 'auto' },
        }}>
          <PodSortSelect
            sortOption={sortOption}
            setSortOption={setSortOption}
          />
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : sortedPods.length > 0 ? (
        <Grid container spacing={3}>
          {sortedPods.map((pod) => (
            <Grid item xs={12} sm={6} md={3} key={pod.name}>
              <PodCard
                pod={pod}
                onOpenLogs={onOpenPodLogs}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <EmptyState onRefresh={onRefresh} />
      )}
    </Box>
  );
};

export default PodList;
