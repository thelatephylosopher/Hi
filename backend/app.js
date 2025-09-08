const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');

// Initialize app
const app = express();
const PORT = process.env.PORT || 8080;

// Startup log
console.log("Starting backend server...");

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// --- Middleware Setup ---

// 1. CORS - Must come before session and routes
app.use(cors({
  origin: 'http://localhost:4028', // Your frontend's origin
  credentials: true
}));

// 2. Session Management
app.use(session({
  secret: 'your_super_secret_key_from_env_vars',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 60 * 1000 // 30 minutes
  },
}));

// 3. Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- NEW: Request Logger Middleware ---
// This will log every incoming request to the console.
// It's placed here to run after the body parsers but before the routers.
app.use((req, res, next) => {
  console.log(`[REQUEST LOGGER] Method: ${req.method}, URL: ${req.originalUrl}`);
  next(); // Pass the request to the next middleware/router
});


// 4. Static File Serving
app.use('/uploads', express.static(uploadDir));

// --- API Routing ---

// Create a main router for all API endpoints
const apiRouter = express.Router();

// Route imports
const uploadRoutes    = require('./routes/upload');
const listRoutes      = require('./routes/list');
const previewRoutes   = require('./routes/preview');
const hideRoutes      = require('./routes/hide');
const authRoutes      = require('./routes/auth');
const graphRoutes     = require('./routes/graph');
const tableRoutes     = require('./routes/tables'); 
const downloadRoutes  = require('./routes/download');
const qcCheckRoutes   = require('./routes/qcCheck');
const dashboardRoutes = require('./routes/dashboard');
const sampleRoutes    = require('./routes/sample');
const elementRoutes   = require('./routes/element');

// Mount all routes onto the main apiRouter
apiRouter.use('/', uploadRoutes);
apiRouter.use('/', listRoutes);
apiRouter.use('/', previewRoutes);
apiRouter.use('/', hideRoutes);
apiRouter.use('/', graphRoutes);
apiRouter.use('/', tableRoutes);
apiRouter.use('/', downloadRoutes);
apiRouter.use('/', qcCheckRoutes);
apiRouter.use('/', dashboardRoutes);
apiRouter.use('/', sampleRoutes);
apiRouter.use('/', elementRoutes);
apiRouter.use('/auth', authRoutes); // This will now correctly be /api/auth

// Mount the main apiRouter under the /api prefix
app.use('/api', apiRouter);

// Fallback for unknown routes
app.use((req, res) => {
  console.warn('Unhandled route hit:', req.method, req.url);
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
