const http = require('http');
const socketio = require('socket.io');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

// Ensure uploads folder exists
const fs = require('fs');
const path = require('path');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Created uploads directory for Proof of Delivery images.');
}

const app = require('./src/app');

// Create HTTP Server
const server = http.createServer(app);

// Integrate Socket.IO
const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

// Configure WebSockets handlers
const configureSockets = require('./src/sockets/socketHandler');
configureSockets(io);

// Launch Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`FleetFlow API Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
