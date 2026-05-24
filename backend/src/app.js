const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./middleware/error');

// Import routes
const authRoutes = require('./routes/authRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const driverRoutes = require('./routes/driverRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000'
];

// Add CLIENT_URL from env if set, stripping any trailing slash
if (process.env.CLIENT_URL) {
  const clientUrls = process.env.CLIENT_URL.split(',').map(url => url.trim().replace(/\/$/, ''));
  allowedOrigins.push(...clientUrls);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, postman, or curl)
    if (!origin) return callback(null, true);
    
    // In development mode, allow any port on localhost to prevent address/port conflicts
    const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
    if (isLocalhost || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Blocked by CORS policy'), false);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.IO to request object
app.use((req, res, next) => {
  req.io = app.get('io');
  next();
});

// Serve proof of delivery images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Load routes
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/analytics', analyticsRoutes);

// Catch 404 routes
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
