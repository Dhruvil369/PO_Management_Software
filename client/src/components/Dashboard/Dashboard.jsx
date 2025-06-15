import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  TextField,
  Box,
  Card,
  CardContent,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  Chip,

  CardActions
} from '@mui/material';
import { Add, Search, Logout, Edit, Visibility, GetApp } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
  const [pos, setPOs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchPOs();
  }, []);

  // Refresh data when component becomes visible (user navigates back)
  useEffect(() => {
    const handleFocus = () => {
      console.log('Dashboard focused, refreshing data...');
      fetchPOs();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Refresh data when navigating back to dashboard
  useEffect(() => {
    console.log('Dashboard location changed, refreshing data...');
    fetchPOs();
  }, [location.pathname]);

  const fetchPOs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);

      const response = await axios.get(`http://localhost:5000/api/pos?${params.toString()}`);
      setPOs(response.data);
    } catch (error) {
      console.error('Error fetching POs:', error);
      setError('Failed to fetch POs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    fetchPOs();
  };

  const createNewPO = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/pos/create');
      const newPO = response.data.po;
      navigate(`/po/${newPO._id}/stage/requirement`);
    } catch (error) {
      console.error('Error creating PO:', error);
      setError('Failed to create new PO');
    }
  };

  const handleEditPO = (po) => {
    if (po.currentStage === 'completed') {
      setError('PO is already completed and cannot be edited');
      return;
    }
    navigate(`/po/${po._id}/stage/${po.currentStage}`);
  };

  const handleViewPO = (poId) => {
    navigate(`/po/${poId}/detail`);
  };

  const handleDownloadPDF = async (po) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/pos/${po._id}/pdf`, {
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      default:
        return 'warning'; // All non-completed statuses show as "In Progress"
    }
  };

  const filteredPOs = pos.filter(po =>
    po.poNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            PO Management Dashboard
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            Welcome, {user?.username}
          </Typography>
          <IconButton color="inherit" onClick={logout}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ width: '100vw', minHeight: '100vh', bgcolor: '#f4f6fb', display: 'flex', flexDirection: 'column' }}>
        <Container maxWidth={false} disableGutters sx={{ flex: 1, py: 4, px: { xs: 2, md: 8, lg: 16 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Typography variant="h3" component="h1" fontWeight={700}>
              Purchase Orders
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={createNewPO}
              size="large"
              sx={{ fontWeight: 600, px: 4, py: 1.5 }}
            >
              New PO
            </Button>
          </Box>

          <Box display="flex" gap={2} mb={4}>
            <TextField
              sx={{ flex: 1, minWidth: 300, maxWidth: 400 }}
              variant="outlined"
              placeholder="Search by PO number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={handleSearch}>
                    <Search />
                  </IconButton>
                ),
              }}
            />
          </Box>

          {loading ? (
            <Typography>Loading...</Typography>
          ) : (
            <Grid container spacing={4}>
              {filteredPOs.length === 0 ? (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" align="center" color="textSecondary">
                        {searchTerm ? 'No POs found matching your search' : 'No POs created yet'}
                      </Typography>
                      {!searchTerm && (
                        <Box textAlign="center" mt={2}>
                          <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={createNewPO}
                          >
                            Create Your First PO
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ) : (
                filteredPOs.map((po) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={po._id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3, borderRadius: 3 }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                          <Typography variant="h6" component="h2" fontWeight={600}>
                            {po.poNumber}
                          </Typography>
                          <Chip
                            label={po.status === 'completed' ? 'Completed' : 'In Progress'}
                            color={getStatusColor(po.status)}
                            size="small"
                          />
                        </Box>

                        <Typography color="textSecondary" gutterBottom>
                          Created: {new Date(po.createdAt).toLocaleDateString()}
                        </Typography>

                        <Typography variant="body2" mb={1}>
                          Machines: {po.machines.length}/6
                        </Typography>

                        {po.isFinalized && (
                          <Chip
                            label="Finalized"
                            color="success"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        )}
                      </CardContent>

                      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                        <Box>
                          {po.currentStage !== 'completed' && (
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<Edit />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPO(po);
                              }}
                            >
                              Edit
                            </Button>
                          )}
                        </Box>

                        <Box display="flex" gap={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPO(po._id);
                            }}
                          >
                            View
                          </Button>

                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<GetApp />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPDF(po);
                            }}
                          >
                            PDF
                          </Button>
                        </Box>
                      </CardActions>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          )}
        </Container>
      </Box>
    </>
  );
};

export default Dashboard;
