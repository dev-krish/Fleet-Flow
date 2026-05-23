const jwt = require('jsonwebtoken');
const { setIoInstance } = require('../services/notificationService');
const { startSimulator } = require('../services/simulatorService');

const configureSockets = (io) => {
  setIoInstance(io);
  
  // Start the background tracking simulator
  startSimulator(io);

  // Authentication Middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fleetflow_jwt_secret_key_2026_super_secure'
      );
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Token invalid'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id} (User: ${socket.user.id}, Role: ${socket.user.role})`);

    // Join private channel for user
    socket.join(`user:${socket.user.id}`);
    
    // Join role channel for broadcasting
    socket.join(`role:${socket.user.role}`);

    // Join shipment live map tracking channel
    socket.on('join:shipment', (shipmentId) => {
      socket.join(`shipment:${shipmentId}`);
      console.log(`Socket ${socket.id} joined tracking room for shipment: ${shipmentId}`);
    });

    // Leave shipment live map tracking channel
    socket.on('leave:shipment', (shipmentId) => {
      socket.leave(`shipment:${shipmentId}`);
      console.log(`Socket ${socket.id} left tracking room for shipment: ${shipmentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });
};

module.exports = configureSockets;
