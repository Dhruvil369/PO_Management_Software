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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CardActions // <-- Added CardActions import
} from '@mui/material';
import { Add, Search, Logout, Edit, Visibility, GetApp } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import socket from '../../socket';
import { API_BASE_URL } from '../../apiConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Dashboard = () => {
  const [pos, setPOs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [jobTitleDialogOpen, setJobTitleDialogOpen] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Fetch all POs on mount (for persistence on refresh)
    axios.get(`${API_BASE_URL}/pos/all`, { withCredentials: true })
      .then(res => setPOs(res.data))
      .catch(() => setError('Failed to fetch all POs'));
    // Listen for PO created and updated events
    socket.on('po_created', (data) => {
      setPOs(prevPOs => {
        if (!prevPOs.some(po => po._id === data.po._id)) {
          return [data.po, ...prevPOs];
        }
        return prevPOs;
      });
    });
    socket.on('po_updated', (data) => {
      // Optionally, fetch all POs again or update the specific PO in state
      axios.get(`${API_BASE_URL}/pos/all`, { withCredentials: true })
        .then(res => setPOs(res.data));
    });
    return () => {
      socket.off('po_created');
      socket.off('po_updated');
    };
  }, [user]);

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

  // Fetch all POs (for both Admin and Employee) from /api/pos/all
  const fetchPOs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/pos/all`, { withCredentials: true });
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
    setJobTitleDialogOpen(true);
  };

  const handleCreatePOWithJobTitle = async () => {
    if (!newJobTitle.trim()) {
      setError('Job title is required to create a new PO');
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/pos/create`, { jobTitle: newJobTitle });
      const newPO = response.data.po;
      setJobTitleDialogOpen(false);
      setNewJobTitle('');
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
      const response = await axios.get(`${API_BASE_URL}/pos/${po._id}/pdf`, {
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

  const handlePrintRequirement = (po) => {
    // Header info
    const poNumber = po.poNumber || '';
    const jobTitle = po.jobTitle || '';
    const date = po.createdAt ? new Date(po.createdAt).toDateString() : '';
    const status = po.status === 'completed' ? 'Completed' : 'In Progress';
    const machinesCount = `${(po.machines || []).length}/6`;

    // All possible subfields for Requirement (stage 1)
    const subfields = [
      { label: 'Size', key: 'size' },
      { label: 'Micron', key: 'micron' },
      { label: 'Bag Type', key: 'bagType' },
      { label: 'Quantity', key: 'quantity' },
      { label: 'Print', key: 'print' },
      { label: 'Color', key: 'color' },
      { label: 'Bag film color', key: 'bagFilmColor' },
      { label: 'Packaging Type', key: 'packagingType' },
      { label: 'Material', key: 'material' },
    ];

    // Build table body: each row is a subfield, each column S1-S6 is the value for that subfield for that size
    const body = subfields.map(subfield => {
      const row = [
        'Requirement',
        subfield.label,
        ...Array.from({ length: 6 }, (_, i) => {
          const req = po.machines && po.machines[i] && po.machines[i].requirement;
          if (!req) return '';
          return req[subfield.key] || '';
        })
      ];
      return row;
    });

    // Table head
    const head = [[
      'Workflow Stage',
      'Subfield',
      'S1', 'S2', 'S3', 'S4', 'S5', 'S6',
    ]];

    // Create PDF
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(12);
    doc.text(`Job Title: ${jobTitle}`, 10, 10);

    autoTable(doc, {
      startY: 15,
      head: head,
      body: body,
      styles: { halign: 'center', valign: 'middle', fontSize: 10 },
      headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold' },
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 35 }, // Workflow Stage
        1: { cellWidth: 30 }, // Subfield
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 25 },
        7: { cellWidth: 25 },
      },
      margin: { left: 5, right: 5 },
    });
    doc.save(`${po.poNumber}_Requirement.pdf`);
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
          ATHARVA BIO PRODUCTS
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
            {/* Only show New PO button for admin users */}
            {user?.role === 'admin' && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={createNewPO}
                size="large"
                sx={{ fontWeight: 600, px: 4, py: 1.5 }}
              >
                New PO
              </Button>
            )}
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
            <Grid container spacing={3} columns={12}>
              {filteredPOs.length === 0 ? (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" align="center" color="textSecondary">
                        {searchTerm ? 'No POs found matching your search' : 'No POs created yet'}
                      </Typography>
                      {/* Only show Create Your First PO for admin users */}
                      {!searchTerm && user?.role === 'admin' && (
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
                  <Grid item xs={12} sm={6} md={4} lg={4} key={po._id}>
                    <Card
                      sx={{
                        width: 340,
                        height: 300,
                        minHeight: 300,
                        maxHeight: 300,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderRadius: 3,
                        boxShadow: 4,
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: 8, borderColor: '#1976d2' },
                        bgcolor: '#fff',
                        p: 0.5,
                        overflow: 'hidden',
                        mx: 'auto',
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1, pb: 0 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            mb: 0.5,
                            letterSpacing: 0.5,
                            fontSize: 18,
                            minHeight: '2.6em',
                            maxHeight: '3.5em',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            color: '#222',
                            fontWeight: 700,
                          }}
                        >
                          {po.poNumber}{po.jobTitle ? ` - ${po.jobTitle}` : ''}
                        </Typography>
                        <Box sx={{ mb: 1 }}>
                          <Chip
                            label={po.status === 'completed' ? 'Completed' : 'In Progress'}
                            color={po.status === 'completed' ? 'success' : 'warning'}
                            size="small"
                            sx={{ width: 'fit-content', fontWeight: 600 }}
                          />
                        </Box>
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: 14 }}>
                          Created: {new Date(po.createdAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: 14 }}>
                          Sizes: {po.machines.length}/6
                        </Typography>
                      </CardContent>
                      <Box sx={{ flexGrow: 1 }} />
                      <CardContent sx={{ pt: 0, pb: 2 }}>
                        <Grid container spacing={1} justifyContent="flex-start" alignItems="flex-end">
                          <Grid item xs={12}>
                            <Box display="flex" gap={1} justifyContent="flex-start" alignItems="center" flexWrap="wrap">
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<Add />}
                                onClick={() => handleEditPO(po)}
                                sx={{ fontWeight: 600, minWidth: 70 }}
                              >
                                SIZE
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Visibility />}
                                onClick={() => handleViewPO(po._id)}
                                sx={{ fontWeight: 600, minWidth: 70 }}
                              >
                                VIEW
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<GetApp />}
                                onClick={() => handleDownloadPDF(po)}
                                sx={{ fontWeight: 600, minWidth: 70 }}
                              >
                                PDF
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handlePrintRequirement(po)}
                                sx={{ fontWeight: 600, minWidth: 70 }}
                              >
                                Print
                              </Button>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          )}

          {/* Only show job title dialog for admin users */}
          {user?.role === 'admin' && (
            <Dialog open={jobTitleDialogOpen} onClose={() => setJobTitleDialogOpen(false)}>
              <DialogTitle>Enter Job Title</DialogTitle>
              <DialogContent>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Job Title"
                  fullWidth
                  value={newJobTitle}
                  onChange={e => setNewJobTitle(e.target.value)}
                  required
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setJobTitleDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreatePOWithJobTitle} variant="contained">Create PO</Button>
              </DialogActions>
            </Dialog>
          )}
        </Container>
      </Box>
    </>
  );
};

export default Dashboard;
