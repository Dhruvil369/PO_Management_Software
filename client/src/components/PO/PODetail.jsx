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
  Divider,
  Card,
  CardContent
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
import { useAuth } from '../../context/AuthContext';
import RequirementForm from './stages/RequirementForm';
import ExtrusionProductionForm from './stages/ExtrusionProductionForm';
import PrintingForm from './stages/PrintingForm';
import CuttingSealingForm from './stages/CuttingSealingForm';
import PunchForm from './stages/PunchForm';
import PackagingDispatchForm from './stages/PackagingDispatchForm';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { API_BASE_URL, UPLOADS_BASE_URL } from '../../apiConfig';

const PODetail = () => {
  const { poId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Use context for user role

  const [po, setPO] = useState(null);
  const [availableMachines, setAvailableMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editModal, setEditModal] = useState({ open: false, stageKey: '', machine: null });

  useEffect(() => {
    fetchPOData();
    fetchAvailableMachines();
  }, [poId]);

  const fetchPOData = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/pos/${poId}`);
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
      const response = await axios.get(`${API_BASE_URL}/pos/${poId}/available-machines`);
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
      await axios.put(`${API_BASE_URL}/pos/${poId}/finalize`);
      fetchPOData(); // Refresh data
    } catch (error) {
      console.error('Error finalizing PO:', error);
      setError('Failed to finalize PO');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/pos/${poId}/pdf`, {
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

  const handleDownloadChallanPDF = async (machine) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/pos/${po._id}/machines/${machine._id}/challan-pdf`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Challan_${po.poNumber}_Machine${machine.machineNo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setError('Failed to download challan PDF');
    }
  };

  const renderStageData = (data, stageKey) => {
    if (!data) {
      return <Typography color="textSecondary">No data entered</Typography>;
    }
    // Show fields in a specific order for requirement stage
    if (stageKey === 'requirement') {
      const order = [
        'size', 'micron', 'bagType', 'quantity', 'print', 'color', 'bagFilmColor', 'packagingType', 'material', 'image', 'date'
      ];
      return (
        <Grid container spacing={2}>
          {order.map(key => {
            const value = data[key];
            if (value === undefined || value === null || value === '') return null;
            if (key === 'image' && value) {
              return (
                <Grid item xs={12} key={key}>
                  <Typography variant="body2"><strong>Image:</strong></Typography>
                  <Box sx={{ mt: 1, mb: 2 }}>
                    <img
                      src={`${UPLOADS_BASE_URL}/${value}`}
                      alt="Stage Upload"
                      style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #eee' }}
                    />
                  </Box>
                </Grid>
              );
            }
            if (key === 'date') {
              return (
                <Grid item xs={12} sm={6} key={key}>
                  <Typography variant="body2">
                    <strong>Date:</strong> {value ? new Date(value).toLocaleDateString() : ''}
                  </Typography>
                </Grid>
              );
            }
            // Custom label for Bag film color
            if (key === 'bagFilmColor') {
              return (
                <Grid item xs={12} sm={6} key={key}>
                  <Typography variant="body2">
                    <strong>Bag film color:</strong> {value}
                  </Typography>
                </Grid>
              );
            }
            // Custom label for Color
            if (key === 'color') {
              return (
                <Grid item xs={12} sm={6} key={key}>
                  <Typography variant="body2">
                    <strong>Color:</strong> {value}
                  </Typography>
                </Grid>
              );
            }
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
    }
    // Default for other stages
    return (
      <Grid container spacing={2}>
        {Object.entries(data).map(([key, value]) => {
          if (key === '_id' || value === null || value === '') return null;
          if (key === 'image' && value) {
            return (
              <Grid item xs={12} key={key}>
                <Typography variant="body2"><strong>Image:</strong></Typography>
                <Box sx={{ mt: 1, mb: 2 }}>
                  <img
                    src={`${UPLOADS_BASE_URL}/${value}`}
                    alt="Stage Upload"
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #eee' }}
                  />
                </Box>
              </Grid>
            );
          }
          if (key === 'data' || key === 'date') {
            return (
              <Grid item xs={12} sm={6} key={key}>
                <Typography variant="body2">
                  <strong>Date:</strong> {value ? new Date(value).toLocaleDateString() : ''}
                </Typography>
              </Grid>
            );
          }
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
    const sizeValue = machine?.requirement?.size || 'Not set';

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
                Size {machineNo}
              </Typography>
              {/* Size Value Display */}
              {hasData && (
                <Box sx={{ 
                  p: 1, 
                  bgcolor: machine?.requirement?.size ? '#e8f5e8' : '#f5f5f5',
                  borderRadius: 1,
                  border: machine?.requirement?.size ? '1px solid #4caf50' : '1px solid #e0e0e0',
                  minWidth: 80,
                  textAlign: 'center'
                }}>
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
                    Size:
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color={machine?.requirement?.size ? 'primary' : 'textSecondary'} sx={{ fontSize: '0.9rem' }}>
                    {sizeValue}
                  </Typography>
                </Box>
              )}
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
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {/* Edit button for machine - moved here to avoid nested button error */}
          {hasData && !allStagesCompleted && nextStage && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<Edit />}
              onClick={() => handleEditMachine(machine)}
              sx={{ mb: 2 }}
            >
              Continue: {nextStage.route.charAt(0).toUpperCase() + nextStage.route.slice(1)}
            </Button>
          )}
          {hasData ? (
            <Box>
              {/* Show Download Challan PDF button if all stages completed and challanNo exists */}
              {allStagesCompleted && machine?.packagingDispatch?.challanNo && (
                <Button
                  variant="contained"
                  color="success"
                  sx={{ mb: 2 }}
                  startIcon={<GetApp />}
                  onClick={() => handleDownloadChallanPDF(machine)}
                >
                  Download Challan PDF
                </Button>
              )}
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
                      <Box display="flex" alignItems="center" gap={1}>
                        {machine?.completedStages?.includes(stage.key) && (
                          <Chip
                            label="Completed"
                            size="small"
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                          />
                        )}
                        {/* Admin-only Edit button for completed stages */}
                        {user?.role === 'admin' && machine?.completedStages?.includes(stage.key) && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            onClick={() => setEditModal({ open: true, stageKey: stage.key, machine })}
                            sx={{ ml: 0.5, textTransform: 'none', fontWeight: 600 }}
                          >
                            Edit
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {renderStageData(stage.data, stage.key)}
                    {/* Download Challan PDF button for Stage 6 */}
                    {stage.key === 'packagingDispatch' && machine?.packagingDispatch?.challanNo && (
                      <Button
                        variant="contained"
                        color="success"
                        sx={{ mt: 2 }}
                        startIcon={<GetApp />}
                        onClick={() => handleDownloadChallanPDF(machine)}
                      >
                        Download Challan PDF
                      </Button>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}

              {/* DEBUG: Show completed stages and challanNo for troubleshooting */}
              <Box sx={{ mb: 1, p: 1, background: '#f9f9f9', border: '1px dashed #ccc', borderRadius: 1 }}>
                <Typography variant="caption" color="secondary">
                  Completed Stages: {machine?.completedStages?.join(', ') || 'None'}<br/>
                  Challan No: {machine?.packagingDispatch?.challanNo || 'N/A'}
                </Typography>
              </Box>
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
            Sizes Configured: {po.machines.length}/6
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
                Add Size
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
                Complete PO
              </Button>
            )}
          </Box>
        </Paper>

        {/* Size Overview Section */}
        {po.machines.length > 0 && (
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Size Overview ({po.machines.length}/6)
            </Typography>
            <Grid container spacing={2}>
              {po.machines.map((machine) => {
                const sizeValue = machine.requirement?.size || 'Not set';
                const allStagesCompleted = machine.completedStages.length === 6;
                
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={machine._id}>
                    <Card sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      boxShadow: 2, 
                      borderRadius: 2,
                      border: machine.requirement?.size ? '2px solid #4caf50' : '2px solid #e0e0e0'
                    }}>
                      <CardContent sx={{ flexGrow: 1, p: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
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
                              label={`${machine.completedStages.length}/6 Stages`}
                              color="primary"
                              size="small"
                            />
                          )}
                        </Box>
                        
                        {/* Size Value Display */}
                        <Box sx={{ 
                          p: 1.5, 
                          bgcolor: machine.requirement?.size ? '#e8f5e8' : '#f5f5f5',
                          borderRadius: 1,
                          border: machine.requirement?.size ? '1px solid #4caf50' : '1px solid #e0e0e0',
                          textAlign: 'center',
                          mb: 1
                        }}>
                          <Typography variant="body2" color="textSecondary" gutterBottom>
                            Size Value:
                          </Typography>
                          <Typography variant="h6" fontWeight={600} color={machine.requirement?.size ? 'primary' : 'textSecondary'}>
                            {sizeValue}
                          </Typography>
                        </Box>
                        
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>
                          Stages completed: {machine.completedStages.length}/6
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        )}

        <Typography variant="h5" gutterBottom>
          Size Details
        </Typography>

        <Box>
          {[1, 2, 3, 4, 5, 6].map(machineNo => renderMachineAccordion(machineNo))}
        </Box>
      </Container>

      {/* --- Edit Modal for Stage --- */}
      <Dialog open={editModal.open} onClose={() => setEditModal({ open: false, stageKey: '', machine: null })} maxWidth="md" fullWidth>
        <DialogTitle>Edit {(() => {
          switch (editModal.stageKey) {
            case 'requirement': return 'Requirement';
            case 'extrusionProduction': return 'Extrusion Production';
            case 'printing': return 'Printing';
            case 'cuttingSealing': return 'Cutting & Sealing';
            case 'punch': return 'Punch';
            case 'packagingDispatch': return 'Packaging & Dispatch';
            default: return '';
          }
        })()} for Machine {editModal.machine?.machineNo}</DialogTitle>
        <DialogContent>
          {editModal.open && editModal.machine && (() => {
            const stageDataMapping = {
              'requirement': editModal.machine.requirement,
              'extrusionProduction': editModal.machine.extrusionProduction,
              'printing': editModal.machine.printing,
              'cuttingSealing': editModal.machine.cuttingSealing,
              'punch': editModal.machine.punch,
              'packagingDispatch': editModal.machine.packagingDispatch
            };
            const initialData = {
              ...stageDataMapping[editModal.stageKey],
              poNumber: po?.poNumber,
              jobTitle: po?.jobTitle
            };
            const commonProps = {
              onComplete: async (formData) => {
                try {
                  const stageMapping = {
                    'requirement': 'requirement',
                    'extrusionProduction': 'extrusionProduction',
                    'printing': 'printing',
                    'cuttingSealing': 'cuttingSealing',
                    'punch': 'punch',
                    'packagingDispatch': 'packagingDispatch'
                  };
                  const dbStageName = stageMapping[editModal.stageKey];
                  if (formData instanceof FormData) {
                    await axios.put(
                      `${API_BASE_URL}/pos/${po._id}/machines/${editModal.machine._id}/stages/${dbStageName}`,
                      formData,
                      { headers: { 'Content-Type': 'multipart/form-data' } }
                    );
                  } else {
                    if (editModal.stageKey === 'packagingDispatch' && formData.image) {
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
                        `${API_BASE_URL}/pos/${po._id}/machines/${editModal.machine._id}/stages/${dbStageName}`,
                        fd,
                        { headers: { 'Content-Type': 'multipart/form-data' } }
                      );
                    } else {
                      const dataObject = { ...formData };
                      if (dataObject.date) {
                        dataObject.date = new Date(dataObject.date).toISOString();
                      }
                      await axios.put(
                        `${API_BASE_URL}/pos/${po._id}/machines/${editModal.machine._id}/stages/${dbStageName}`,
                        dataObject,
                        { headers: { 'Content-Type': 'application/json' } }
                      );
                    }
                  }
                  await fetchPOData();
                  setEditModal({ open: false, stageKey: '', machine: null });
                } catch (error) {
                  setError('Failed to update: ' + (error.response?.data?.message || error.message));
                }
              },
              availableMachines: [editModal.machine.machineNo],
              initialData,
              isEditing: true,
              machineNo: editModal.machine.machineNo,
              updateButtonLabel: 'Update'
            };
            switch (editModal.stageKey) {
              case 'requirement':
                return <RequirementForm {...commonProps} />;
              case 'extrusionProduction':
                return <ExtrusionProductionForm {...commonProps} />;
              case 'printing':
                return <PrintingForm {...commonProps} />;
              case 'cuttingSealing':
                return <CuttingSealingForm {...commonProps} />;
              case 'punch':
                return <PunchForm {...commonProps} />;
              case 'packagingDispatch':
                return <PackagingDispatchForm {...commonProps} />;
              default:
                return <Typography>Invalid stage</Typography>;
            }
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModal({ open: false, stageKey: '', machine: null })} color="secondary">Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PODetail;
