import React, { useState, useEffect } from 'react';
import { useSize } from '../../../context/SizeContext';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Alert,
  Input
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const PackagingDispatchForm = ({ onComplete, onBack, machineData, initialData }) => {
  const { size } = useSize();
  const [formData, setFormData] = useState({
    size: size || '',
    totalWeight: '',
    noOfRolls: '',
    noOfBags: '',
    date: initialData?.date || null,
    image: null
  });
  const [challanNo, setChallanNo] = useState(initialData?.challanNo || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, size: size }));
  }, [size]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'size') return; // Prevent editing size
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleDateChange = (newDate) => {
    setFormData(prev => ({ ...prev, date: newDate }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let submitData;
      if (formData.image) {
        submitData = new FormData();
        Object.keys(formData).forEach(key => {
          if (formData[key] !== null && formData[key] !== '') {
            if (key === 'date' && formData[key]) {
              submitData.append(key, new Date(formData[key]).toISOString());
            } else {
              submitData.append(key, formData[key]);
            }
          }
        });
      } else {
        submitData = {
          ...formData,
          totalWeight: formData.totalWeight ? parseFloat(formData.totalWeight) : null,
          noOfRolls: formData.noOfRolls ? parseInt(formData.noOfRolls) : null,
          noOfBags: formData.noOfBags ? parseInt(formData.noOfBags) : null,
          date: formData.date ? new Date(formData.date).toISOString() : null
        };
      }
      if (onComplete) {
        const result = await onComplete(submitData);
        if (result && result.challanNo) {
          setChallanNo(result.challanNo);
        }
      } else {
        throw new Error('onComplete function not provided');
      }
    } catch (error) {
      setError('Failed to save packaging & dispatch data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '70vh' }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 6 }, width: '100%', maxWidth: 1100, mt: 2 }}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Stage 6: Packaging & Dispatch
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
                label="Size"
                name="size"
                value={formData.size}
                onChange={handleChange}
                disabled
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Total Weight"
                name="totalWeight"
                type="number"
                value={formData.totalWeight}
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
                label="No. of Bags"
                name="noOfBags"
                type="number"
                value={formData.noOfBags}
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
            <Grid item xs={12}>
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Upload Image
                </Typography>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={loading}
                  sx={{ display: 'none' }}
                  id="packaging-image-upload"
                />
                <label htmlFor="packaging-image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    disabled={loading}
                  >
                    Choose Image
                  </Button>
                </label>
                {formData.image && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Selected: {formData.image.name}
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={onBack}
              disabled={loading}
              size="large"
              sx={{ minWidth: 140, fontWeight: 600 }}
            >
              Back
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {challanNo && (
                <Box sx={{ p: 1.5, background: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0', minWidth: 120 }}>
                  <Typography variant="subtitle2" color="success.main" sx={{ textAlign: 'center' }}>
                    Challan No.: <b>{challanNo}</b>
                  </Typography>
                </Box>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                size="large"
                sx={{ minWidth: 180, fontWeight: 600 }}
              >
                {loading ? 'Saving...' : 'Complete Machine Entry'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default PackagingDispatchForm;
