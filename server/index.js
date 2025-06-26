const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

console.log('Starting server...');

// Load environment variables
dotenv.config();

console.log('Environment loaded');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000',
            'https://po-management-software.onrender.com',
            'https://po-management-software.vercel.app'
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true
    }
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors({
    origin: ['http://localhost:3000',
        'https://po-management-software.onrender.com',
        'https://po-management-software.vercel.app'
    ],
    credentials: true
}));

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

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});