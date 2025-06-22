const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

console.log('Starting server...');

// Load environment variables
dotenv.config();

console.log('Environment loaded');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pos', require('./routes/pos'));

// MongoDB connection
const connectDB = async() => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/po-management', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        console.log('Server will start without MongoDB. Please ensure MongoDB is running.');
    }
};

// Connect to database
connectDB();

// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'PO Management System API' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});