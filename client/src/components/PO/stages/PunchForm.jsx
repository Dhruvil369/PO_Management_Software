import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Alert
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const PunchForm = ({ onComplete, onBack, machineData, initialData }) => {
  const [formData, setFormData] = useState({
    machineNo: '',
    bagSize: initialData?.size || '',
    operatorName: '',
    punchName: '',
    kgs: '',
    waste: '',
    date: initialData?.date || null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData?.size) {
      setFormData(prev => ({
        ...prev,
        bagSize: initialData.size
      }));
    }
  }, [initialData?.size]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'bagSize') return;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleDateChange = (newDate) => {
    setFormData(prev => ({ ...prev, date: newDate }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('PunchForm - Form data:', formData);

    try {
      const submitData = {
        ...formData,
        machineNo: formData.machineNo ? parseInt(formData.machineNo) : null,
        kgs: formData.kgs ? parseFloat(formData.kgs) : null,
        waste: formData.waste ? parseFloat(formData.waste) : null,
        date: formData.date ? new Date(formData.date).toISOString() : null
      };

      console.log('PunchForm - Submitting data:', submitData);

      if (onComplete) {
        await onComplete(submitData);
        console.log('PunchForm - Data submitted successfully');
      } else {
        throw new Error('onComplete function not provided');
      }
    } catch (error) {
      console.error('PunchForm - Submit error:', error);
      setError('Failed to save punch data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '70vh' }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 6 }, width: '100%', maxWidth: 1100, mt: 2 }}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Stage 5: Punch
          {initialData?.poNumber && initialData?.jobTitle && (
            <span style={{ fontWeight: 400, fontSize: 22, marginLeft: 16 }}>
              | {initialData.poNumber} - {initialData.jobTitle}
            </span>
          )}
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
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Bag Size (from Stage 1): <span style={{ color: '#1976d2' }}>{formData.bagSize || 'N/A'}</span>
              </Typography>
              <TextField
                fullWidth
                label="Bag Size"
                name="bagSize"
                value={formData.bagSize}
                onChange={handleChange}
                disabled={true}
                InputProps={{ readOnly: true }}
                sx={{
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: '#1976d2',
                    fontWeight: 600
                  }
                }}
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
                label="Punch Size"
                name="punchName"
                value={formData.punchName}
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
                label="Waste"
                name="waste"
                type="number"
                value={formData.waste}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={handleDateChange}
                  disablePast
                  renderInput={(params) => (
                    <TextField {...params} fullWidth required disabled={loading} inputProps={{ ...params.inputProps, readOnly: true }} />
                  )}
                />
              </LocalizationProvider>
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
              {loading ? 'Saving...' : 'Next: Packaging & Dispatch'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default PunchForm;
