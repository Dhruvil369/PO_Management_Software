# PO Management System

A comprehensive MERN Stack application for managing Purchase Orders (POs) with a 6-stage workflow system for manufacturing processes.

## Features

### 🔐 Authentication
- User registration and login
- JWT-based authentication
- Secure session management

### 📋 PO Management
- Create new Purchase Orders with auto-generated PO numbers (PO-1, PO-2, etc.)
- 6-stage workflow for each machine:
  1. **Requirement** - Machine specs, materials, image upload
  2. **Extrusion Production** - Production details, operator info
  3. **Printing** - Printing process data
  4. **Cutting & Sealing** - Cutting and sealing operations
  5. **Punch** - Punching operations
  6. **Packaging & Dispatch** - Final packaging and dispatch

### 🏭 Machine Management
- Up to 6 machines per PO
- No duplicate machine numbers per PO
- Track completion status for each stage
- Collapsible view for easy data review

### 📊 Dashboard
- View all POs with search functionality
- Status tracking (Draft, In-Progress, Completed)
- Quick access to PO details and machine addition

### 📄 PDF Export
- Generate comprehensive PDF reports
- Include all machine data and stages
- Professional formatting for record-keeping

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Multer** for file uploads
- **PDFKit** for PDF generation
- **bcryptjs** for password hashing

### Frontend
- **React** with Vite
- **Material-UI** for components
- **React Router** for navigation
- **Axios** for API calls
- **Context API** for state management

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
npm run install-server

# Install client dependencies
npm run install-client
```

### 2. Environment Setup

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/po-management
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

### 3. Start the Application

```bash
# Start both server and client concurrently
npm run dev

# Or start individually:
# Server only (http://localhost:5000)
npm run server

# Client only (http://localhost:3000)
npm run client
```

## Usage

### 1. Register/Login
- Create a new account or login with existing credentials
- Access the dashboard after successful authentication

### 2. Create a New PO
- Click "New PO" button on dashboard
- System generates unique PO number (PO-1, PO-2, etc.)
- Redirected to machine workflow

### 3. Add Machine Data
- Select available machine number (1-6)
- Complete 6-stage workflow:
  - Fill requirement details with optional image upload
  - Progress through production stages
  - Each stage saves automatically

### 4. Manage POs
- View all POs on dashboard
- Search by PO number
- Click PO to view detailed machine data
- Add more machines (up to 6 per PO)
- Finalize PO when complete

### 5. Export Data
- Download PDF reports with complete machine data
- Professional formatting for documentation

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### PO Management
- `POST /api/pos/create` - Create new PO
- `GET /api/pos` - Get all POs (with search)
- `GET /api/pos/:id` - Get specific PO
- `GET /api/pos/:id/available-machines` - Get available machine numbers
- `POST /api/pos/:id/machines` - Add machine to PO
- `PUT /api/pos/:poId/machines/:machineId/stages/:stage` - Update machine stage
- `PUT /api/pos/:id/finalize` - Finalize PO
- `GET /api/pos/:id/pdf` - Generate PDF report

## Project Structure

```
├── server/                 # Backend application
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── middleware/        # Authentication middleware
│   ├── uploads/           # File upload directory
│   └── index.js           # Server entry point
├── client/                # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── context/       # Context providers
│   │   └── App.jsx        # Main app component
│   └── public/            # Static assets
└── package.json           # Root package configuration
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request




Drive and backup.