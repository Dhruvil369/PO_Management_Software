import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';

const ExtrusionProductionForm = ({ onComplete, onBack, machineData, initialData, isEditing, machineNo, availableMachines }) => {
  const [formData, setFormData] = useState({
    machineNo: machineNo || '',
    extrusionNo: initialData?.extrusionNo || '',
    size: initialData?.size || '',
    operatorName: initialData?.operatorName || '',
    ampere: initialData?.ampere || '',
    frequency: initialData?.frequency || '',
    kgs: initialData?.kgs || '',
    noOfRolls: initialData?.noOfRolls || '',
    waste: initialData?.waste || '',
    qcApprovedBy: initialData?.qcApprovedBy || '',
    remark: initialData?.remark || ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('ExtrusionProductionForm - Form data:', formData);

    try {
      // Convert numeric fields
      const submitData = {
        ...formData,
        ampere: formData.ampere ? parseFloat(formData.ampere) : null,
        frequency: formData.frequency ? parseFloat(formData.frequency) : null,
        kgs: formData.kgs ? parseFloat(formData.kgs) : null,
        noOfRolls: formData.noOfRolls ? parseInt(formData.noOfRolls) : null,
        waste: formData.waste ? parseFloat(formData.waste) : null
      };

      console.log('ExtrusionProductionForm - Submitting data:', submitData);

      if (onComplete) {
        await onComplete(submitData);
        console.log('ExtrusionProductionForm - Data submitted successfully');
      } else {
        throw new Error('onComplete function not provided');
      }
    } catch (error) {
      console.error('ExtrusionProductionForm - Submit error:', error);
      setError('Failed to save extrusion production data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '70vh' }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 6 }, width: '100%', maxWidth: 1100, mt: 2 }}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Stage 2: Extrusion Production
        </Typography>
        {machineData && (
          <Typography variant="subtitle1" color="primary" gutterBottom>
            Machine {machineData.machineNo}
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={4}>
            {!isEditing && (
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Machine No.</InputLabel>
                  <Select
                    name="machineNo"
                    value={formData.machineNo}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    {availableMachines?.map((machineNo) => (
                      <MenuItem key={machineNo} value={machineNo}>
                        Machine {machineNo}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Extrusion No."
                name="extrusionNo"
                value={formData.extrusionNo}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Size"
                name="size"
                value={formData.size}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Operator Name"
                name="operatorName"
                value={formData.operatorName}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Ampere"
                name="ampere"
                type="number"
                value={formData.ampere}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Frequency"
                name="frequency"
                type="number"
                value={formData.frequency}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Kgs"
                name="kgs"
                type="number"
                value={formData.kgs}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="No. of Rolls"
                name="noOfRolls"
                type="number"
                value={formData.noOfRolls}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Waste"
                name="waste"
                type="number"
                value={formData.waste}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="QC Approved By"
                name="qcApprovedBy"
                value={formData.qcApprovedBy}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Remark"
                name="remark"
                multiline
                rows={3}
                value={formData.remark}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={onBack}
              disabled={loading}
              size="large"
              sx={{ minWidth: 140, fontWeight: 600 }}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              size="large"
              sx={{ minWidth: 180, fontWeight: 600 }}
            >
              {loading
                ? 'Saving...'
                : (isEditing ? 'Update Machine' : 'Next: Printing')
              }
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ExtrusionProductionForm;
