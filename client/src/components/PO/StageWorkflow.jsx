import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  Card,
  CardContent,
  Grid,
  Chip,
  Fab
} from '@mui/material';
import { ArrowBack, Add, CheckCircle, RadioButtonUnchecked, Edit } from '@mui/icons-material';
import axios from 'axios';

// Import stage components
import RequirementForm from './stages/RequirementForm';
import ExtrusionProductionForm from './stages/ExtrusionProductionForm';
import PrintingForm from './stages/PrintingForm';
import CuttingSealingForm from './stages/CuttingSealingForm';
import PunchForm from './stages/PunchForm';
import PackagingDispatchForm from './stages/PackagingDispatchForm';

const StageWorkflow = () => {
  const { poId, stage } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const machineIdFromUrl = searchParams.get('machineId');

  const [po, setPO] = useState(null);
  const [availableMachines, setAvailableMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);

  useEffect(() => {
    fetchPOData();
    fetchAvailableMachines();
  }, [poId]);

  useEffect(() => {
    // If machineId is provided in URL, automatically open edit form for that machine
    if (machineIdFromUrl && po) {
      const machine = po.machines.find(m => m._id === machineIdFromUrl);
      if (machine) {
        setEditingMachine(machine);
        setShowAddForm(true);
        console.log('Auto-opening form for machine:', machine.machineNo);
      }
    }
  }, [machineIdFromUrl, po]);

  const fetchPOData = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/pos/${poId}`);
      setPO(response.data);
    } catch (error) {
      console.error('Error fetching PO:', error);
      setError('Failed to fetch PO data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableMachines = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/pos/${poId}/available-machines`);
      setAvailableMachines(response.data.availableMachines);
    } catch (error) {
      console.error('Error fetching available machines:', error);
    }
  };

  const handleMachineAdd = async (formData) => {
    try {
      setError('');
      console.log('handleMachineAdd called with:', { editingMachine, stage, formData });

      // Map URL stage names to database stage names
      const stageMapping = {
        'requirement': 'requirement',
        'extrusion': 'extrusionProduction',
        'printing': 'printing',
        'cutting': 'cuttingSealing',
        'punch': 'punch',
        'packaging': 'packagingDispatch'
      };

      const dbStageName = stageMapping[stage] || stage;
      console.log('Stage mapping:', { urlStage: stage, dbStage: dbStageName });

      if (editingMachine) {
        // If editing and formData is FormData (has image), send as multipart/form-data
        if (formData instanceof FormData) {
          await axios.put(
            `http://localhost:5000/api/pos/${poId}/machines/${editingMachine._id}/stages/${dbStageName}`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );
        } else {
          // Convert to FormData if stage is packaging and image exists
          if (stage === 'packaging' && formData.image) {
            const fd = new FormData();
            Object.keys(formData).forEach(key => {
              if (formData[key] !== null && formData[key] !== '') {
                if (key === 'date' && formData[key]) {
                  fd.append(key, new Date(formData[key]).toISOString());
                } else {
                  fd.append(key, formData[key]);
                }
              }
            });
            await axios.put(
              `http://localhost:5000/api/pos/${poId}/machines/${editingMachine._id}/stages/${dbStageName}`,
              fd,
              {
                headers: {
                  'Content-Type': 'multipart/form-data',
                },
              }
            );
          } else {
            // Fallback: send as JSON
            const dataObject = { ...formData };
            if (dataObject.date) {
              dataObject.date = new Date(dataObject.date).toISOString();
            }
            await axios.put(
              `http://localhost:5000/api/pos/${poId}/machines/${editingMachine._id}/stages/${dbStageName}`,
              dataObject,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
          }
        }
        console.log('Machine updated successfully');
      } else {
        // Add new machine - use URL stage name for route
        const response = await axios.post(
          `http://localhost:5000/api/pos/${poId}/machines/${stage}`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        console.log('Machine added successfully:', response.data);
      }

      // Refresh data
      await fetchPOData();
      await fetchAvailableMachines();

      // Hide form and reset editing state
      setShowAddForm(false);
      setEditingMachine(null);

      // Navigate back to dashboard after successful update
      if (editingMachine) {
        console.log('Navigating back to dashboard after update');
        navigate('/dashboard');
      }

    } catch (error) {
      console.error('Error saving machine:', error);
      setError('Failed to save machine: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCompleteStage = async () => {
    try {
      setError('');

      const response = await axios.put(`http://localhost:5000/api/pos/${poId}/complete-stage`);

      console.log('Stage completed:', response.data);

      // Navigate back to dashboard
      navigate('/dashboard');

    } catch (error) {
      console.error('Error completing stage:', error);
      setError('Failed to complete stage: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCompleteMachineStage = async (machineId, stageName) => {
    try {
      setError('');

      // Map stage names to match API expectations
      const stageMapping = {
        'requirement': 'requirement',
        'extrusion': 'extrusionProduction',
        'printing': 'printing',
        'cutting': 'cuttingSealing',
        'punch': 'punch',
        'packaging': 'packagingDispatch'
      };

      const apiStage = stageMapping[stage] || stage;

      const response = await axios.put(
        `http://localhost:5000/api/pos/${poId}/machines/${machineId}/complete-stage/${apiStage}`
      );

      console.log('Machine stage completed:', response.data);

      // Refresh PO data
      await fetchPOData();

    } catch (error) {
      console.error('Error completing machine stage:', error);
      setError('Failed to complete machine stage: ' + (error.response?.data?.message || error.message));
    }
  };

  const renderStageForm = () => {
    // Get existing data for the stage being edited
    const getExistingData = () => {
      let stageData = {};
      if (editingMachine) {
        const stageDataMapping = {
          'requirement': editingMachine.requirement,
          'extrusion': editingMachine.extrusionProduction,
          'printing': editingMachine.printing,
          'cutting': editingMachine.cuttingSealing,
          'punch': editingMachine.punch,
          'packaging': editingMachine.packagingDispatch
        };
        stageData = stageDataMapping[stage] || {};
      }
      // Always include poNumber and jobTitle from parent PO
      return {
        ...stageData,
        poNumber: po?.poNumber,
        jobTitle: po?.jobTitle
      };
    };

    const commonProps = {
      onComplete: handleMachineAdd,
      availableMachines: editingMachine ? [editingMachine.machineNo] : availableMachines,
      initialData: getExistingData(),
      isEditing: !!editingMachine,
      machineNo: editingMachine?.machineNo
    };

    switch (stage) {
      case 'requirement':
        return <RequirementForm {...commonProps} />;
      case 'extrusion':
        return <ExtrusionProductionForm {...commonProps} />;
      case 'printing':
        return <PrintingForm {...commonProps} />;
      case 'cutting':
        return <CuttingSealingForm {...commonProps} />;
      case 'punch':
        return <PunchForm {...commonProps} />;
      case 'packaging':
        return <PackagingDispatchForm {...commonProps} />;
      default:
        return <Typography>Invalid stage</Typography>;
    }
  };

  const getStageDisplayName = (stageName) => {
    const stageNames = {
      requirement: 'Requirement',
      extrusion: 'Extrusion Production',
      printing: 'Printing',
      cutting: 'Cutting & Sealing',
      punch: 'Punch',
      packaging: 'Packaging & Dispatch'
    };
    return stageNames[stageName] || stageName;
  };

  const getNextIncompleteStage = (machine) => {
    const stageOrder = [
      { key: 'requirement', route: 'requirement' },
      { key: 'extrusionProduction', route: 'extrusion' },
      { key: 'printing', route: 'printing' },
      { key: 'cuttingSealing', route: 'cutting' },
      { key: 'punch', route: 'punch' },
      { key: 'packagingDispatch', route: 'packaging' }
    ];

    for (const stage of stageOrder) {
      if (!machine.completedStages.includes(stage.key)) {
        return stage;
      }
    }
    return null; // All stages completed
  };

  const handleEditMachine = (machine) => {
    const nextStage = getNextIncompleteStage(machine);
    console.log('handleEditMachine called:', { machine, nextStage });
    if (nextStage) {
      const navigationPath = `/po/${poId}/stage/${nextStage.route}?machineId=${machine._id}`;
      console.log('Navigating to:', navigationPath);
      navigate(navigationPath);
    } else {
      setError('All stages completed for this machine');
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (!po) {
    return <Typography>PO not found</Typography>;
  }

  // Allow access to any stage for individual machine progression
  // Removed the restriction that only allowed current PO stage

  return (
    <Box sx={{ width: '100vw', minHeight: '100vh', bgcolor: '#f4f6fb', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {po.poNumber} - {getStageDisplayName(stage)}
          </Typography>
          <Chip 
            label={`Stage: ${getStageDisplayName(stage)}`} 
            color="primary" 
            variant="outlined"
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} disableGutters sx={{ flex: 1, py: 4, px: { xs: 2, md: 8, lg: 16 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Typography variant="h4" gutterBottom fontWeight={700}>
          Machines Added ({po.machines.length}/6)
        </Typography>

        <Grid container spacing={4} sx={{ mb: 4 }}>
          {po.machines.map((machine) => {
            const nextStage = getNextIncompleteStage(machine);
            const allStagesCompleted = machine.completedStages.length === 6;
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={machine._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3, borderRadius: 3 }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6">
                        Machine {machine.machineNo}
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
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      Stages completed: {machine.completedStages.length}/6
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="textSecondary">
                        Progress:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
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
                    {!allStagesCompleted && nextStage && !po.isFinalized && (
                      <Button
                        variant="contained"
                        size="small"
                        fullWidth
                        startIcon={<Edit />}
                        sx={{ mt: 1 }}
                        onClick={() => handleEditMachine(machine)}
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

        {availableMachines.length > 0 && !showAddForm && (
          <Box sx={{ mb: 4 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowAddForm(true)}
              size="large"
              sx={{ fontWeight: 600, px: 4, py: 1.5 }}
            >
              {stage === 'requirement' ? 'Add Size' : 'Add Machine'}
            </Button>
          </Box>
        )}

        {showAddForm && !po.isFinalized && (
          <Box sx={{ mb: 4, maxWidth: 600, mx: 'auto', bgcolor: '#fff', p: 4, borderRadius: 3, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom>
              {editingMachine
                ? `Edit Machine ${editingMachine.machineNo} - ${getStageDisplayName(stage)}`
                : `Add New Machine - ${getStageDisplayName(stage)}`
              }
            </Typography>
            {renderStageForm()}
            <Button
              variant="outlined"
              onClick={() => {
                setShowAddForm(false);
                setEditingMachine(null);
              }}
              sx={{ mt: 2 }}
            >
              Cancel
            </Button>
          </Box>
        )}

        {po.machines.length > 0 && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="textSecondary">
              Use the "Continue" button on each machine to proceed to the next incomplete stage
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Each machine can progress independently through all 6 stages
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default StageWorkflow;
