import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Box,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Alert
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import axios from 'axios';

// Import stage components
import RequirementForm from './stages/RequirementForm';
import ExtrusionProductionForm from './stages/ExtrusionProductionForm';
import PrintingForm from './stages/PrintingForm';
import CuttingSealingForm from './stages/CuttingSealingForm';
import PunchForm from './stages/PunchForm';
import PackagingDispatchForm from './stages/PackagingDispatchForm';

const steps = [
  'Requirement',
  'Extrusion Production',
  'Printing',
  'Cutting & Sealing',
  'Punch',
  'Packaging & Dispatch'
];

const POWorkflow = () => {
  const { poId } = useParams();
  const navigate = useNavigate();
  
  const [activeStep, setActiveStep] = useState(0);
  const [po, setPO] = useState(null);
  const [currentMachine, setCurrentMachine] = useState(null);
  const [availableMachines, setAvailableMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPOData();
    fetchAvailableMachines();
  }, [poId]);

  // Debug logging
  useEffect(() => {
    console.log('POWorkflow - poId:', poId);
    console.log('Current machine state:', currentMachine);
    console.log('Active step:', activeStep);
  }, [currentMachine, poId, activeStep]);

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

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prevActiveStep) => prevActiveStep - 1);
    }
  };

  const handleStageComplete = async (stageData) => {
    try {
      setError(''); // Clear any previous errors

      if (activeStep === 0) {
        // First stage - create machine entry
        console.log('Creating machine with data:', stageData);

        const response = await axios.post(
          `http://localhost:5000/api/pos/${poId}/machines`,
          stageData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        const newMachine = response.data.machine;
        console.log('Machine created successfully:', newMachine);
        setCurrentMachine(newMachine);

        // Move to next stage
        setActiveStep(1);
      } else {
        // Subsequent stages - update machine
        const stageNames = [
          'requirement',
          'extrusionProduction',
          'printing',
          'cuttingSealing',
          'punch',
          'packagingDispatch'
        ];

        if (!currentMachine || !currentMachine._id) {
          console.error('Current machine state:', currentMachine);
          setError('Machine data not found. Please start from the beginning.');
          setActiveStep(0); // Reset to first stage
          return;
        }

        console.log('Updating machine:', currentMachine._id, 'stage:', stageNames[activeStep], 'data:', stageData);

        const response = await axios.put(
          `http://localhost:5000/api/pos/${poId}/machines/${currentMachine._id}/stages/${stageNames[activeStep]}`,
          stageData
        );

        console.log('Stage updated successfully:', response.data);

        // Update current machine with latest data
        setCurrentMachine(response.data.machine);

        if (activeStep === steps.length - 1) {
          // Last stage completed
          navigate(`/po/${poId}/detail`);
        } else {
          // Move to next stage
          setActiveStep(activeStep + 1);
        }
      }
    } catch (error) {
      console.error('Error saving stage data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      setError('Failed to save stage data: ' + errorMessage);
    }
  };

  const renderStageForm = () => {
    const commonProps = {
      onComplete: handleStageComplete,
      onBack: activeStep > 0 ? handleBack : null,
      machineData: currentMachine,
    };

    switch (activeStep) {
      case 0:
        return <RequirementForm {...commonProps} availableMachines={availableMachines} />;
      case 1:
        return <ExtrusionProductionForm {...commonProps} />;
      case 2:
        return <PrintingForm {...commonProps} />;
      case 3:
        return <CuttingSealingForm {...commonProps} />;
      case 4:
        return <PunchForm {...commonProps} />;
      case 5:
        return <PackagingDispatchForm {...commonProps} />;
      default:
        return null;
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
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
            {po?.poNumber} - Machine Entry Workflow
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box sx={{ width: '100%', mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {renderStageForm()}
      </Container>
    </>
  );
};

export default POWorkflow;
