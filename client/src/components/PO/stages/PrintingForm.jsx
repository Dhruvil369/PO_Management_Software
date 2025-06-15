import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Alert
} from '@mui/material';

const PrintingForm = ({ onComplete, onBack, machineData }) => {
  const [formData, setFormData] = useState({
    machineNo: '',
    size: '',
    operatorName: '',
    noOfRolls: '',
    waste: '',
    kgs: ''
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

    console.log('PrintingForm - Form data:', formData);

    try {
      const submitData = {
        ...formData,
        machineNo: formData.machineNo ? parseInt(formData.machineNo) : null,
        noOfRolls: formData.noOfRolls ? parseInt(formData.noOfRolls) : null,
        waste: formData.waste ? parseFloat(formData.waste) : null,
        kgs: formData.kgs ? parseFloat(formData.kgs) : null
      };

      console.log('PrintingForm - Submitting data:', submitData);

      if (onComplete) {
        await onComplete(submitData);
        console.log('PrintingForm - Data submitted successfully');
      } else {
        throw new Error('onComplete function not provided');
      }
    } catch (error) {
      console.error('PrintingForm - Submit error:', error);
      setError('Failed to save printing data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '70vh' }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 6 }, width: '100%', maxWidth: 1100, mt: 2 }}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Stage 3: Printing
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
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Machine No."
                name="machineNo"
                type="number"
                value={formData.machineNo}
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
                label="Kgs"
                name="kgs"
                type="number"
                value={formData.kgs}
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
              {loading ? 'Saving...' : 'Next: Cutting & Sealing'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default PrintingForm;
