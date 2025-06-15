import React, { useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Input,
  Alert
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

const RequirementForm = ({ onComplete, availableMachines, initialData, isEditing, machineNo }) => {
  const [formData, setFormData] = useState({
    machineNo: machineNo || '',
    size: initialData?.size || '',
    micron: initialData?.micron || '',
    bagType: initialData?.bagType || '',
    quantity: initialData?.quantity || '',
    print: initialData?.print || '',
    color: initialData?.color || '',
    packagingType: initialData?.packagingType || '',
    material: initialData?.material || '',
    image: null
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF)');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('RequirementForm - Form data:', formData);

    // Validation
    if (!formData.machineNo) {
      setError('Please select a machine number');
      setLoading(false);
      return;
    }

    if (!formData.quantity || isNaN(formData.quantity) || formData.quantity <= 0) {
      setError('Please enter a valid quantity');
      setLoading(false);
      return;
    }

    try {
      console.log('RequirementForm - Submitting data:', formData);
      console.log('RequirementForm - isEditing:', isEditing);

      let submitData;

      if (isEditing) {
        // For editing, send as JSON object (no file upload for updates)
        submitData = {};
        Object.keys(formData).forEach(key => {
          if (key !== 'image' && formData[key] !== null && formData[key] !== '') {
            submitData[key] = formData[key];
          }
        });
        console.log('RequirementForm - Editing mode, sending JSON:', submitData);
      } else {
        // For new machines, use FormData for file upload
        submitData = new FormData();
        Object.keys(formData).forEach(key => {
          if (formData[key] !== null && formData[key] !== '') {
            submitData.append(key, formData[key]);
          }
        });
        console.log('RequirementForm - Adding mode, sending FormData');
      }

      // Call the onComplete function passed from parent
      if (onComplete) {
        await onComplete(submitData);
        console.log('RequirementForm - Data submitted successfully');
      } else {
        throw new Error('onComplete function not provided');
      }
    } catch (error) {
      console.error('RequirementForm - Submit error:', error);
      setError('Failed to save requirement data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '70vh' }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 6 }, width: '100%', maxWidth: 1100, mt: 2 }}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Stage 1: Requirement
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Machine No.</InputLabel>
                <Select
                  name="machineNo"
                  value={formData.machineNo}
                  onChange={handleChange}
                  disabled={loading || isEditing}
                >
                  {availableMachines.map((machineNo) => (
                    <MenuItem key={machineNo} value={machineNo}>
                      Machine {machineNo}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                label="Micron"
                name="micron"
                value={formData.micron}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Bag Type"
                name="bagType"
                value={formData.bagType}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                disabled={loading}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Print"
                name="print"
                value={formData.print}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Color"
                name="color"
                value={formData.color}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Packaging Type"
                name="packagingType"
                value={formData.packagingType}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Material"
                name="material"
                value={formData.material}
                onChange={handleChange}
                disabled={loading}
              />
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
                  id="image-upload"
                />
                <label htmlFor="image-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
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
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              size="large"
              sx={{ minWidth: 180, fontWeight: 600 }}
            >
              {loading
                ? (isEditing ? 'Updating...' : 'Adding Machine...')
                : (isEditing ? 'Update Machine' : 'Add Machine')
              }
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default RequirementForm;
