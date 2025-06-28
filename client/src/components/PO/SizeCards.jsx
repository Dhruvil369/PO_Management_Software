import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Grid,
  Button
} from '@mui/material';
import { CheckCircle, RadioButtonUnchecked, Edit } from '@mui/icons-material';

const SizeCards = ({ machines, onEditMachine, getStageDisplayName, getNextIncompleteStage, po }) => {
  return (
    <Grid container spacing={4} sx={{ mb: 4 }}>
      {machines.map((machine) => {
        const nextStage = getNextIncompleteStage(machine);
        const allStagesCompleted = machine.completedStages.length === 6;
        const sizeValue = machine.requirement?.size || 'Not set';
        
        return (
          <Grid item xs={12} sm={6} md={4} lg={3} key={machine._id}>
            <Card sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              boxShadow: 3, 
              borderRadius: 3,
              border: machine.requirement?.size ? '2px solid #4caf50' : '2px solid #e0e0e0'
            }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight={600}>
                    Size {machine.machineNo}
                  </Typography>
                  {allStagesCompleted ? (
                    <Chip
                      label="All Completed"
                      color="success"
                      size="small"
                      icon={<CheckCircle />}
                    />
                  ) : (
                    <Chip
                      label={`Next: ${nextStage ? getStageDisplayName(nextStage.route) : 'None'}`}
                      color="info"
                      size="small"
                      icon={<RadioButtonUnchecked />}
                    />
                  )}
                </Box>
                
                {/* Size Value Display */}
                <Box sx={{ 
                  mb: 2, 
                  p: 2, 
                  bgcolor: machine.requirement?.size ? '#e8f5e8' : '#f5f5f5',
                  borderRadius: 2,
                  border: machine.requirement?.size ? '1px solid #4caf50' : '1px solid #e0e0e0'
                }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Size Value:
                  </Typography>
                  <Typography variant="h6" fontWeight={600} color={machine.requirement?.size ? 'primary' : 'textSecondary'}>
                    {sizeValue}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Stages completed: {machine.completedStages.length}/6
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    Progress:
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {['requirement', 'extrusionProduction', 'printing', 'cuttingSealing', 'punch', 'packagingDispatch'].map(stageName => {
                      const isCompleted = machine.completedStages.includes(stageName);
                      const stageDisplayNames = {
                        'requirement': 'Req',
                        'extrusionProduction': 'Ext',
                        'printing': 'Print',
                        'cuttingSealing': 'Cut',
                        'punch': 'Punch',
                        'packagingDispatch': 'Pack'
                      };
                      return (
                        <Chip
                          key={stageName}
                          label={stageDisplayNames[stageName]}
                          size="small"
                          color={isCompleted ? 'success' : 'default'}
                          variant={isCompleted ? 'filled' : 'outlined'}
                          sx={{ fontSize: '0.7rem', height: 20 }}
                        />
                      );
                    })}
                  </Box>
                </Box>

                {/* Edit Button */}
                {!allStagesCompleted && nextStage && !po.isFinalized && (
                  <Button
                    variant="contained"
                    size="small"
                    fullWidth
                    startIcon={<Edit />}
                    sx={{ mt: 1 }}
                    onClick={() => onEditMachine(machine)}
                  >
                    Continue: {getStageDisplayName(nextStage.route)}
                  </Button>
                )}
                {allStagesCompleted && (
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled
                    sx={{ mt: 1 }}
                  >
                    ✓ All Stages Completed
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default SizeCards; 