import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Paper,
  Chip,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  Add,
  GetApp,
  ExpandMore,
  CheckCircle,
  RadioButtonUnchecked,
  Edit
} from '@mui/icons-material';
import axios from 'axios';

const PODetail = () => {
  const { poId } = useParams();
  const navigate = useNavigate();

  const [po, setPO] = useState(null);
  const [availableMachines, setAvailableMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPOData();
    fetchAvailableMachines();
  }, [poId]);

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

  const handleAddMachine = () => {
    if (po.currentStage === 'completed') {
      setError('Cannot add machines to completed PO');
      return;
    }
    navigate(`/po/${poId}/stage/${po.currentStage}`);
  };

  const handleEditPO = () => {
    if (po.currentStage === 'completed') {
      setError('PO is already completed and cannot be edited');
      return;
    }
    navigate(`/po/${poId}/stage/${po.currentStage}`);
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
    console.log('PODetail handleEditMachine called:', { machine, nextStage });
    if (nextStage) {
      const navigationPath = `/po/${poId}/stage/${nextStage.route}?machineId=${machine._id}`;
      console.log('PODetail navigating to:', navigationPath);
      navigate(navigationPath);
    } else {
      setError('All stages completed for this machine');
    }
  };

  const handleFinalizePO = async () => {
    try {
      await axios.put(`http://localhost:5000/api/pos/${poId}/finalize`);
      fetchPOData(); // Refresh data
    } catch (error) {
      console.error('Error finalizing PO:', error);
      setError('Failed to finalize PO');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/pos/${poId}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${po.poNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setError('Failed to download PDF');
    }
  };

  const renderStageData = (data) => {
    if (!data) {
      return <Typography color="textSecondary">No data entered</Typography>;
    }

    return (
      <Grid container spacing={2}>
        {Object.entries(data).map(([key, value]) => {
          if (key === '_id' || value === null || value === '') return null;

          return (
            <Grid item xs={12} sm={6} key={key}>
              <Typography variant="body2">
                <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> {value}
              </Typography>
            </Grid>
          );
        })}
      </Grid>
    );
  };



  const renderMachineAccordion = (machineNo) => {
    const machine = po?.machines.find(m => m.machineNo === machineNo);
    const hasData = !!machine;
    const nextStage = machine ? getNextIncompleteStage(machine) : null;
    const allStagesCompleted = machine ? machine.completedStages.length === 6 : false;

    const stages = [
      { key: 'requirement', label: 'Requirement', data: machine?.requirement },
      { key: 'extrusionProduction', label: 'Extrusion Production', data: machine?.extrusionProduction },
      { key: 'printing', label: 'Printing', data: machine?.printing },
      { key: 'cuttingSealing', label: 'Cutting & Sealing', data: machine?.cuttingSealing },
      { key: 'punch', label: 'Punch', data: machine?.punch },
      { key: 'packagingDispatch', label: 'Packaging & Dispatch', data: machine?.packagingDispatch }
    ];

    return (
      <Accordion key={machineNo} disabled={!hasData}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h6">
                Machine {machineNo}
              </Typography>
              {hasData ? (
                <Chip
                  label={allStagesCompleted ? "All Completed" : `${machine.completedStages.length}/6 Stages`}
                  color={allStagesCompleted ? "success" : "primary"}
                  size="small"
                />
              ) : (
                <Chip label="Not Configured" color="default" size="small" />
              )}
            </Box>

            {/* Edit button for machine */}
            {hasData && !allStagesCompleted && nextStage && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Edit />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditMachine(machine);
                }}
                sx={{ ml: 2 }}
              >
                Continue: {nextStage.route.charAt(0).toUpperCase() + nextStage.route.slice(1)}
              </Button>
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {hasData ? (
            <Box>
              {stages.map((stage, index) => (
                <Accordion key={stage.key} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                      <Box display="flex" alignItems="center" gap={1}>
                        {machine?.completedStages?.includes(stage.key) ? (
                          <CheckCircle color="success" fontSize="small" />
                        ) : (
                          <RadioButtonUnchecked color="disabled" fontSize="small" />
                        )}
                        <Typography>
                          {index + 1}. {stage.label}
                        </Typography>
                      </Box>
                      {machine?.completedStages?.includes(stage.key) && (
                        <Chip
                          label="Completed"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {renderStageData(stage.data)}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ) : (
            <Typography color="textSecondary">
              Machine not configured yet
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
    );
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (!po) {
    return <Typography>PO not found</Typography>;
  }

  return (
    <>
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
            {po.poNumber} - Details
          </Typography>
        </Toolbar>
      </AppBar>
 <Box sx={{ width: '100vw',  display: 'flex', flexDirection: 'column' }}></Box>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4">
              {po.poNumber}
            </Typography>
            <Box display="flex" gap={2}>
              <Chip
                label={po.status === 'completed' ? 'Completed' : 'In Progress'}
                color={po.status === 'completed' ? 'success' : 'warning'}
              />
              {po.isFinalized && (
                <Chip label="Finalized" color="success" />
              )}
            </Box>
          </Box>
          
          <Typography variant="body1" color="textSecondary" gutterBottom>
            Created: {new Date(po.createdAt).toLocaleDateString()}
          </Typography>
          
          <Typography variant="body1" gutterBottom>
            Machines Configured: {po.machines.length}/6
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Box display="flex" gap={2} flexWrap="wrap">
            {po.currentStage !== 'completed' && (
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={handleEditPO}
              >
                Edit Current Stage
              </Button>
            )}

            {availableMachines.length > 0 && po.currentStage !== 'completed' && (
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleAddMachine}
              >
                Add Machine
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={handleDownloadPDF}
            >
              Download PDF
            </Button>

            {!po.isFinalized && po.machines.length > 0 && (
              <Button
                variant="contained"
                color="success"
                onClick={handleFinalizePO}
              >
                Finalize PO
              </Button>
            )}
          </Box>
        </Paper>

        <Typography variant="h5" gutterBottom>
          Machine Details
        </Typography>

        <Box>
          {[1, 2, 3, 4, 5, 6].map(machineNo => renderMachineAccordion(machineNo))}
        </Box>
      </Container>
    </>
  );
};

export default PODetail;
