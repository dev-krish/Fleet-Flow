const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken } = require('./auth');

let db = {
  users: [],
  vehicles: [],
  drivers: [],
  shipments: [],
  notifications: [],
  activities: []
};

// Load database file
const loadDb = () => {
  try {
    const dataPath = path.join(__dirname, '../config/mock_db_data.json');
    if (fs.existsSync(dataPath)) {
      const fileContent = fs.readFileSync(dataPath, 'utf8');
      db = JSON.parse(fileContent);
      console.log(`Loaded ${db.users.length} users, ${db.shipments.length} shipments from JSON database.`);
    } else {
      console.log('Mock DB file not found. Seeding is required.');
    }
  } catch (error) {
    console.error('Error loading Mock DB data:', error);
  }
};

// Save database file (sync state)
const saveDb = () => {
  try {
    const dataPath = path.join(__dirname, '../config/mock_db_data.json');
    fs.writeFileSync(dataPath, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error saving Mock DB data:', error);
  }
};

// Initial load
loadDb();

// Helper to wrap response
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};
const sendError = (res, message = 'Error', statusCode = 500) => {
  return res.status(statusCode).json({ success: false, message });
};

// Logger helpers
const logActivity = (userId, action, details) => {
  const userObj = db.users.find(u => u._id.toString() === userId.toString());
  const activity = {
    _id: new Date().getTime().toString(),
    user: userObj ? { _id: userObj._id, name: userObj.name, role: userObj.role, email: userObj.email, avatar: userObj.avatar } : null,
    action,
    details,
    createdAt: new Date().toISOString(),
  };
  db.activities.unshift(activity);
  if (db.activities.length > 50) db.activities.pop();
  saveDb();
};

const dispatchNotification = (io, { recipient, recipientRole, title, message, type, metadata = {} }) => {
  const notification = {
    _id: new Date().getTime().toString(),
    recipient: recipient ? recipient.toString() : null,
    recipientRole: recipientRole || 'All',
    title,
    message,
    type,
    readBy: [],
    metadata,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notification);
  saveDb();

  if (io) {
    if (recipient) io.to(`user:${recipient.toString()}`).emit('notification:new', notification);
    if (recipientRole && recipientRole !== 'All') io.to(`role:${recipientRole}`).emit('notification:new', notification);
    if (!recipient && recipientRole === 'All') io.emit('notification:new', notification);
  }
};

// API Mocks Implementation
const mockAuth = {
  login: async (req, res) => {
    const { email, password } = req.body;
    const user = db.users.find(u => u.email === email.toLowerCase());
    if (!user) return sendError(res, 'Invalid credentials', 401);
    if (user.status === 'Inactive') return sendError(res, 'Account deactivated', 403);

    // Verify hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return sendError(res, 'Invalid credentials', 401);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    saveDb();

    return sendSuccess(res, {
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, avatar: user.avatar },
      accessToken,
      refreshToken
    }, 'Login successful');
  },

  register: async (req, res) => {
    const { name, email, password, role, phone, licenseNumber, experience } = req.body;
    if (db.users.some(u => u.email === email.toLowerCase())) return sendError(res, 'User already exists', 400);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = {
      _id: new Date().getTime().toString(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'Driver',
      phone,
      status: 'Active',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
      refreshTokens: []
    };

    db.users.push(newUser);

    if (newUser.role === 'Driver') {
      if (!licenseNumber) return sendError(res, 'Driver license number is required', 400);
      const newDriver = {
        _id: new Date().getTime().toString(),
        user: newUser._id,
        licenseNumber,
        experience: Number(experience || 0),
        status: 'Available',
        assignedVehicle: null
      };
      db.drivers.push(newDriver);
    }

    saveDb();
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    return sendSuccess(res, {
      user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, phone: newUser.phone },
      accessToken,
      refreshToken
    }, 'User registered successfully', 201);
  },

  refresh: async (req, res) => {
    const { refreshToken } = req.body;
    const user = db.users.find(u => u.refreshTokens?.includes(refreshToken));
    if (!user) return sendError(res, 'Invalid refresh token', 403);
    
    try {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'fleetflow_jwt_refresh_secret_key_2026_super_secure');
      const accessToken = generateAccessToken(user);
      return sendSuccess(res, { accessToken }, 'Refreshed access token');
    } catch {
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
      saveDb();
      return sendError(res, 'Expired refresh token', 403);
    }
  },

  getMe: async (req, res) => {
    const user = db.users.find(u => u._id.toString() === req.user.id.toString());
    if (!user) return sendError(res, 'User not found', 404);
    
    const profile = { user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, avatar: user.avatar } };
    if (user.role === 'Driver') {
      const driverProfile = db.drivers.find(d => d.user.toString() === user._id.toString());
      if (driverProfile) {
        const vehicle = db.vehicles.find(v => v._id.toString() === driverProfile.assignedVehicle?.toString());
        profile.driverProfile = { ...driverProfile, assignedVehicle: vehicle || null };
      }
    }
    return sendSuccess(res, profile, 'User loaded');
  },

  googleLogin: async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return sendError(res, 'Google idToken is required', 400);

    try {
      let payload;
      if (idToken === 'mock_google_token_bypass') {
        payload = {
          email: 'simulated.google.driver@fleetflow.com',
          name: 'Simulated Google Driver',
          picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'
        };
      } else {
        // Validate Google Token using public endpoint
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        payload = await response.json();

        if (payload.error_description || !payload.email) {
          return sendError(res, 'Google authentication token validation failed', 400);
        }
      }

      const email = payload.email.toLowerCase();
      let user = db.users.find(u => u.email === email);

      if (!user) {
        // Auto-register as Driver
        const randomPassword = Math.random().toString(36).slice(-10);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);
        
        user = {
          _id: new Date().getTime().toString(),
          name: payload.name || 'Google User',
          email,
          password: hashedPassword,
          role: 'Driver',
          avatar: payload.picture || '',
          phone: '+1 (555) 000-0000',
          status: 'Active',
          refreshTokens: []
        };
        db.users.push(user);

        // Create Driver Profile
        const randomLicense = 'CDL-GGL-' + Math.floor(10000 + Math.random() * 90000);
        const driverProfile = {
          _id: new Date().getTime().toString() + '-drv',
          user: user._id,
          licenseNumber: randomLicense,
          experience: 1,
          status: 'Available',
          assignedVehicle: null
        };
        db.drivers.push(driverProfile);
      }

      if (user.status === 'Inactive') {
        return sendError(res, 'Your user profile has been deactivated', 403);
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      user.refreshTokens = user.refreshTokens || [];
      user.refreshTokens.push(refreshToken);
      saveDb();

      return sendSuccess(res, {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
      }, 'Google sign-in successful');
    } catch (error) {
      return sendError(res, `Google auth server communication failed: ${error.message}`, 500);
    }
  }
};

const mockShipments = {
  getShipments: async (req, res) => {
    let list = [...db.shipments];
    const { status, priority, search, driver } = req.query;

    if (req.user.role === 'Driver') {
      list = list.filter(s => s.driver?.toString() === req.user.id.toString());
    } else if (driver) {
      list = list.filter(s => s.driver?.toString() === driver.toString());
    }

    if (status) list = list.filter(s => s.status === status);
    if (priority) list = list.filter(s => s.priority === priority);
    if (search) {
      const reg = new RegExp(search, 'i');
      list = list.filter(s => reg.test(s.shipmentId) || reg.test(s.origin?.name) || reg.test(s.destination?.name));
    }

    // Populate drivers & vehicles in memory
    const populated = list.map(ship => {
      const d = db.users.find(u => u._id.toString() === ship.driver?.toString());
      const v = db.vehicles.find(veh => veh._id.toString() === ship.vehicle?.toString());
      return {
        ...ship,
        driver: d ? { _id: d._id, name: d.name, email: d.email, phone: d.phone, avatar: d.avatar } : null,
        vehicle: v ? { _id: v._id, vehicleNumber: v.vehicleNumber, type: v.type, capacity: v.capacity } : null
      };
    });

    return sendSuccess(res, { shipments: populated, pagination: { total: list.length, page: 1, pages: 1 } });
  },

  getShipmentById: async (req, res) => {
    const ship = db.shipments.find(s => s._id.toString() === req.params.id);
    if (!ship) return sendError(res, 'Shipment not found', 404);

    const d = db.users.find(u => u._id.toString() === ship.driver?.toString());
    const v = db.vehicles.find(veh => veh._id.toString() === ship.vehicle?.toString());
    const wm = db.users.find(u => u._id.toString() === ship.warehouseManager?.toString());
    
    const commentsPopulated = (ship.comments || []).map(c => {
      const u = db.users.find(user => user._id.toString() === c.user?.toString());
      return { ...c, user: u ? { _id: u._id, name: u.name, role: u.role, avatar: u.avatar } : null };
    });

    const historyPopulated = (ship.statusHistory || []).map(h => {
      const u = db.users.find(user => user._id.toString() === h.updatedBy?.toString());
      return { ...h, updatedBy: u ? { _id: u._id, name: u.name, role: u.role } : null };
    });

    return sendSuccess(res, {
      ...ship,
      driver: d ? { _id: d._id, name: d.name, email: d.email, phone: d.phone, avatar: d.avatar } : null,
      vehicle: v ? { _id: v._id, vehicleNumber: v.vehicleNumber, type: v.type, capacity: v.capacity, fuelStatus: v.fuelStatus, maintenanceStatus: v.maintenanceStatus, currentLocation: v.currentLocation } : null,
      warehouseManager: wm ? { _id: wm._id, name: wm.name, email: wm.email } : null,
      comments: commentsPopulated,
      statusHistory: historyPopulated
    });
  },

  createShipment: async (req, res) => {
    const { origin, destination, scheduledDeliveryDate, priority, dimensions } = req.body;
    const shipmentId = `FF-${10001 + db.shipments.length}`;
    
    // Route points interpolator
    const points = [];
    const pointsCount = 15;
    for (let i = 0; i <= pointsCount; i++) {
      const ratio = i / pointsCount;
      const lat = origin.lat + (destination.lat - origin.lat) * ratio;
      const lng = origin.lng + (destination.lng - origin.lng) * ratio;
      points.push({ lat, lng });
    }

    const newShipment = {
      _id: new Date().getTime().toString(),
      shipmentId,
      origin,
      destination,
      status: 'Pending',
      priority: priority || 'Medium',
      vehicle: null,
      driver: null,
      warehouseManager: req.user.id,
      scheduledDeliveryDate,
      dimensions: dimensions || { weight: 0, volume: 0 },
      routeCoordinates: points,
      currentCoordinates: { lat: origin.lat, lng: origin.lng },
      comments: [],
      statusHistory: [{ status: 'Pending', updatedAt: new Date().toISOString(), updatedBy: req.user.id, reason: 'Shipment created' }]
    };

    db.shipments.push(newShipment);
    saveDb();
    
    logActivity(req.user.id, 'CREATE_SHIPMENT', `Created shipment ${shipmentId}`);
    dispatchNotification(req.io, { recipientRole: 'Dispatcher', title: 'New Shipment Created', message: `Shipment ${shipmentId} is ready for dispatch assignment.`, type: 'SYSTEM_ALERT', metadata: { shipmentId: newShipment._id } });

    return sendSuccess(res, newShipment, 'Created shipment', 201);
  },

  updateShipment: async (req, res) => {
    const ship = db.shipments.find(s => s._id.toString() === req.params.id);
    if (!ship) return sendError(res, 'Shipment not found', 404);
    if (ship.status !== 'Pending' && ship.status !== 'Assigned') return sendError(res, 'Cannot edit details after dispatch', 400);

    const { origin, destination, scheduledDeliveryDate, priority, dimensions } = req.body;
    if (origin) ship.origin = origin;
    if (destination) ship.destination = destination;
    if (scheduledDeliveryDate) ship.scheduledDeliveryDate = scheduledDeliveryDate;
    if (priority) ship.priority = priority;
    if (dimensions) ship.dimensions = dimensions;

    saveDb();
    logActivity(req.user.id, 'UPDATE_SHIPMENT', `Updated shipment ${ship.shipmentId}`);
    return sendSuccess(res, ship, 'Updated shipment');
  },

  assignShipment: async (req, res) => {
    const { vehicleId, driverId } = req.body;
    const ship = db.shipments.find(s => s._id.toString() === req.params.id);
    if (!ship) return sendError(res, 'Shipment not found', 404);

    const vehicle = db.vehicles.find(v => v._id.toString() === vehicleId.toString());
    const driverUser = db.users.find(u => u._id.toString() === driverId.toString());
    const driverProfile = db.drivers.find(d => d.user.toString() === driverId.toString());

    if (!vehicle || !driverUser || !driverProfile) return sendError(res, 'Driver or vehicle not found', 404);

    // Pre-release vehicle & driver
    db.vehicles.forEach(v => { if (v.assignedDriver?.toString() === driverId.toString()) { v.availability = true; v.assignedDriver = null; } });
    db.drivers.forEach(d => { if (d.assignedVehicle?.toString() === vehicleId.toString()) { d.status = 'Available'; d.assignedVehicle = null; } });

    // Assign
    vehicle.availability = false;
    vehicle.assignedDriver = driverId;
    driverProfile.status = 'On Duty';
    driverProfile.assignedVehicle = vehicleId;

    ship.vehicle = vehicleId;
    ship.driver = driverId;
    ship.status = 'Assigned';
    ship.statusHistory.push({
      status: 'Assigned',
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id,
      reason: `Assigned Vehicle ${vehicle.vehicleNumber} and Driver ${driverUser.name}`
    });

    saveDb();
    logActivity(req.user.id, 'ASSIGN_SHIPMENT', `Assigned shipment ${ship.shipmentId} to driver ${driverUser.name}`);
    dispatchNotification(req.io, { recipient: driverId, recipientRole: 'Driver', title: 'New Dispatch Assigned', message: `You have been assigned to Shipment ${ship.shipmentId}.`, type: 'SHIPMENT_ASSIGNED', metadata: { shipmentId: ship._id } });

    return sendSuccess(res, ship, 'Assigned successfully');
  },

  updateShipmentStatus: async (req, res) => {
    const { status, reason } = req.body;
    const ship = db.shipments.find(s => s._id.toString() === req.params.id);
    if (!ship) return sendError(res, 'Shipment not found', 404);

    ship.status = status;
    ship.statusHistory.push({
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id,
      reason: reason || `Status updated to ${status}`
    });

    if (status === 'Delivered') {
      ship.actualDeliveryTime = new Date().toISOString();
      const veh = db.vehicles.find(v => v._id.toString() === ship.vehicle?.toString());
      if (veh) {
        veh.availability = true;
        veh.currentLocation = { lat: ship.destination.lat, lng: ship.destination.lng, address: ship.destination.address };
      }
      const drv = db.drivers.find(d => d.user.toString() === ship.driver?.toString());
      if (drv) {
        drv.status = 'Available';
        drv.assignedVehicle = null;
      }
      dispatchNotification(req.io, { recipientRole: 'Warehouse Manager', title: 'Shipment Delivered', message: `Shipment ${ship.shipmentId} has been successfully delivered.`, type: 'SHIPMENT_DELIVERED', metadata: { shipmentId: ship._id } });
    } else if (status === 'Delayed') {
      dispatchNotification(req.io, { recipientRole: 'Dispatcher', title: 'Shipment Delayed Alert', message: `Shipment ${ship.shipmentId} has been delayed. Reason: ${reason || 'N/A'}`, type: 'SHIPMENT_DELAYED', metadata: { shipmentId: ship._id } });
    }

    saveDb();
    logActivity(req.user.id, 'UPDATE_STATUS', `Updated shipment ${ship.shipmentId} status to ${status}`);
    return sendSuccess(res, ship, 'Status updated');
  },

  addComment: async (req, res) => {
    const { comment } = req.body;
    const ship = db.shipments.find(s => s._id.toString() === req.params.id);
    if (!ship) return sendError(res, 'Shipment not found', 404);

    ship.comments = ship.comments || [];
    ship.comments.push({
      user: req.user.id,
      comment,
      timestamp: new Date().toISOString()
    });

    saveDb();

    // Populate comments user
    const commentsPopulated = ship.comments.map(c => {
      const u = db.users.find(user => user._id.toString() === c.user.toString());
      return { ...c, user: u ? { _id: u._id, name: u.name, role: u.role, avatar: u.avatar } : null };
    });

    return sendSuccess(res, commentsPopulated, 'Comment added');
  },

  deliverShipment: async (req, res) => {
    const { signedBy } = req.body;
    const ship = db.shipments.find(s => s._id.toString() === req.params.id);
    if (!ship) return sendError(res, 'Shipment not found', 404);
    if (!req.file) return sendError(res, 'Please upload proof of delivery image', 400);

    ship.status = 'Delivered';
    ship.actualDeliveryTime = new Date().toISOString();
    ship.proofOfDelivery = {
      imageUrl: `/uploads/${req.file.filename}`,
      signedBy: signedBy || 'Unsigned',
      timestamp: new Date().toISOString()
    };

    ship.statusHistory.push({
      status: 'Delivered',
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id,
      reason: `Delivered with POD. Signed by: ${signedBy || 'Unsigned'}`
    });

    // Release Vehicle & Driver
    const veh = db.vehicles.find(v => v._id.toString() === ship.vehicle?.toString());
    if (veh) {
      veh.availability = true;
      veh.currentLocation = { lat: ship.destination.lat, lng: ship.destination.lng, address: ship.destination.address };
    }

    const drv = db.drivers.find(d => d.user.toString() === ship.driver?.toString());
    if (drv) {
      drv.status = 'Available';
      drv.assignedVehicle = null;
    }

    saveDb();
    logActivity(req.user.id, 'DELIVER_SHIPMENT', `Delivered shipment ${ship.shipmentId} with Proof of Delivery`);
    dispatchNotification(req.io, { recipientRole: 'Warehouse Manager', title: 'Delivery Completed', message: `Shipment ${ship.shipmentId} delivered to ${ship.destination.name}.`, type: 'SHIPMENT_DELIVERED', metadata: { shipmentId: ship._id } });

    return sendSuccess(res, ship, 'Shipment delivered');
  },

  deleteShipment: async (req, res) => {
    const index = db.shipments.findIndex(s => s._id.toString() === req.params.id);
    if (index === -1) return sendError(res, 'Shipment not found', 404);

    const ship = db.shipments[index];
    if (ship.status !== 'Pending' && ship.status !== 'Cancelled') return sendError(res, 'Cannot delete an active shipment', 400);

    db.shipments.splice(index, 1);
    saveDb();
    logActivity(req.user.id, 'DELETE_SHIPMENT', `Deleted shipment ${ship.shipmentId}`);
    return sendSuccess(res, null, 'Deleted successfully');
  }
};

const mockVehicles = {
  getVehicles: async (req, res) => {
    const list = db.vehicles.map(v => {
      const d = db.users.find(u => u._id.toString() === v.assignedDriver?.toString());
      return { ...v, assignedDriver: d ? { _id: d._id, name: d.name, email: d.email, phone: d.phone, avatar: d.avatar } : null };
    });
    return sendSuccess(res, list);
  },

  createVehicle: async (req, res) => {
    const { vehicleNumber, type, capacity, fuelStatus } = req.body;
    if (db.vehicles.some(v => v.vehicleNumber === vehicleNumber)) return sendError(res, 'Vehicle already exists', 400);

    const newVeh = {
      _id: new Date().getTime().toString(),
      vehicleNumber,
      type,
      capacity: Number(capacity),
      fuelStatus: Number(fuelStatus || 100),
      currentLocation: { lat: 34.0522, lng: -118.2437, address: 'LA Logistics Hub' },
      maintenanceStatus: 'Satisfactory',
      availability: true,
      assignedDriver: null
    };

    db.vehicles.push(newVeh);
    saveDb();
    logActivity(req.user.id, 'CREATE_VEHICLE', `Created vehicle ${vehicleNumber}`);
    return sendSuccess(res, newVeh, 'Vehicle registered', 201);
  },

  updateVehicle: async (req, res) => {
    const veh = db.vehicles.find(v => v._id.toString() === req.params.id);
    if (!veh) return sendError(res, 'Vehicle not found', 404);

    const { type, capacity, fuelStatus, maintenanceStatus, availability } = req.body;
    if (type) veh.type = type;
    if (capacity) veh.capacity = capacity;
    if (fuelStatus !== undefined) veh.fuelStatus = fuelStatus;
    if (availability !== undefined) veh.availability = availability;

    if (maintenanceStatus) {
      veh.maintenanceStatus = maintenanceStatus;
      if (maintenanceStatus === 'Under Repair' || maintenanceStatus === 'Service Due') {
        veh.availability = false;
        
        if (maintenanceStatus === 'Under Repair' && veh.assignedDriver) {
          const drv = db.drivers.find(d => d.user.toString() === veh.assignedDriver.toString());
          if (drv) {
            drv.status = 'Available';
            drv.assignedVehicle = null;
          }
          const driverId = veh.assignedDriver;
          veh.assignedDriver = null;
          dispatchNotification(req.io, { recipient: driverId, title: 'Vehicle Maintenance Recall', message: `Your assigned vehicle ${veh.vehicleNumber} is recalled for repairs.`, type: 'MAINTENANCE_DUE' });
        }
        dispatchNotification(req.io, { recipientRole: 'Admin', title: 'Vehicle Maintenance Needed', message: `Vehicle ${veh.vehicleNumber} has maintenance status: ${maintenanceStatus}.`, type: 'MAINTENANCE_DUE', metadata: { vehicleId: veh._id } });
      } else if (maintenanceStatus === 'Satisfactory') {
        veh.availability = true;
      }
    }

    saveDb();
    logActivity(req.user.id, 'UPDATE_VEHICLE', `Updated vehicle ${veh.vehicleNumber}`);
    return sendSuccess(res, veh, 'Updated vehicle');
  },

  deleteVehicle: async (req, res) => {
    const index = db.vehicles.findIndex(v => v._id.toString() === req.params.id);
    if (index === -1) return sendError(res, 'Vehicle not found', 404);

    const veh = db.vehicles[index];
    if (!veh.availability) return sendError(res, 'Cannot delete an active vehicle', 400);

    db.vehicles.splice(index, 1);
    saveDb();
    logActivity(req.user.id, 'DELETE_VEHICLE', `Deleted vehicle ${veh.vehicleNumber}`);
    return sendSuccess(res, null, 'Deleted successfully');
  }
};

const mockDrivers = {
  getDrivers: async (req, res) => {
    const list = db.drivers.map(d => {
      const u = db.users.find(user => user._id.toString() === d.user.toString());
      const v = db.vehicles.find(veh => veh._id.toString() === d.assignedVehicle?.toString());
      return {
        ...d,
        user: u ? { _id: u._id, name: u.name, email: u.email, phone: u.phone, avatar: u.avatar, status: u.status } : null,
        assignedVehicle: v ? { _id: v._id, vehicleNumber: v.vehicleNumber, type: v.type, capacity: v.capacity, fuelStatus: v.fuelStatus } : null
      };
    });
    return sendSuccess(res, list);
  },

  updateDriverStatus: async (req, res) => {
    const d = db.drivers.find(drv => drv._id.toString() === req.params.id);
    if (!d) return sendError(res, 'Driver profile not found', 404);

    const { status, experience, licenseNumber } = req.body;
    if (status) d.status = status;
    if (experience !== undefined) d.experience = Number(experience);
    if (licenseNumber) d.licenseNumber = licenseNumber;

    saveDb();
    logActivity(req.user.id, 'UPDATE_DRIVER_STATUS', `Updated driver profile ID ${d._id}`);

    const u = db.users.find(user => user._id.toString() === d.user.toString());
    const v = db.vehicles.find(veh => veh._id.toString() === d.assignedVehicle?.toString());

    return sendSuccess(res, {
      ...d,
      user: u ? { _id: u._id, name: u.name, email: u.email, phone: u.phone, avatar: u.avatar, status: u.status } : null,
      assignedVehicle: v ? { _id: v._id, vehicleNumber: v.vehicleNumber, type: v.type } : null
    }, 'Driver status updated');
  },

  getDriverTasks: async (req, res) => {
    const tasks = db.shipments.filter(s => s.driver?.toString() === req.user.id.toString() && ['Assigned', 'In Transit', 'Delayed'].includes(s.status));
    const populated = tasks.map(ship => {
      const v = db.vehicles.find(veh => veh._id.toString() === ship.vehicle?.toString());
      const wm = db.users.find(user => user._id.toString() === ship.warehouseManager?.toString());
      return {
        ...ship,
        vehicle: v ? { _id: v._id, vehicleNumber: v.vehicleNumber, type: v.type, capacity: v.capacity, fuelStatus: v.fuelStatus } : null,
        warehouseManager: wm ? { _id: wm._id, name: wm.name, email: wm.email, phone: wm.phone } : null
      };
    });
    return sendSuccess(res, populated);
  }
};

const mockAnalytics = {
  getKPIs: async (req, res) => {
    const totalShipments = db.shipments.length;
    const pendingShipments = db.shipments.filter(s => s.status === 'Pending').length;
    const assignedShipments = db.shipments.filter(s => s.status === 'Assigned').length;
    const transitShipments = db.shipments.filter(s => s.status === 'In Transit').length;
    const delayedShipments = db.shipments.filter(s => s.status === 'Delayed').length;
    const deliveredShipments = db.shipments.filter(s => s.status === 'Delivered').length;
    const cancelledShipments = db.shipments.filter(s => s.status === 'Cancelled').length;

    const totalVehicles = db.vehicles.length;
    const maintenanceVehicles = db.vehicles.filter(v => ['Service Due', 'Under Repair'].includes(v.maintenanceStatus)).length;
    const activeVehicles = db.vehicles.filter(v => !v.availability).length;

    const totalDrivers = db.drivers.length;
    const onDutyDrivers = db.drivers.filter(d => d.status === 'On Duty').length;
    const availableDrivers = db.drivers.filter(d => d.status === 'Available').length;

    const denominator = totalShipments - cancelledShipments - pendingShipments;
    const successRate = denominator > 0 ? Math.round((deliveredShipments / denominator) * 100) : 0;

    return sendSuccess(res, {
      shipments: {
        total: totalShipments,
        pending: pendingShipments,
        assigned: assignedShipments,
        inTransit: transitShipments,
        delayed: delayedShipments,
        delivered: deliveredShipments,
        cancelled: cancelledShipments,
        successRate,
      },
      vehicles: {
        total: totalVehicles,
        active: activeVehicles,
        inMaintenance: maintenanceVehicles,
      },
      drivers: {
        total: totalDrivers,
        onDuty: onDutyDrivers,
        available: availableDrivers,
      },
    });
  },

  getChartData: async (req, res) => {
    // 1. Shipment Status split
    const statuses = ['Pending', 'Assigned', 'In Transit', 'Delayed', 'Delivered', 'Cancelled'];
    const statusSplit = statuses.map(s => ({
      _id: s,
      count: db.shipments.filter(sh => sh.status === s).length
    }));

    // 2. Shipment Priority split
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    const prioritySplit = priorities.map(p => ({
      _id: p,
      count: db.shipments.filter(sh => sh.priority === p).length
    }));

    // 3. Deliveries over time (mock group by date)
    const deliveryGroup = {};
    db.shipments.forEach(s => {
      if (s.status === 'Delivered' && s.actualDeliveryTime) {
        const dateStr = s.actualDeliveryTime.substring(0, 10);
        deliveryGroup[dateStr] = (deliveryGroup[dateStr] || 0) + 1;
      }
    });
    const deliveriesOverTime = Object.keys(deliveryGroup).sort().map(date => ({
      _id: date,
      deliveries: deliveryGroup[date]
    }));

    // 4. Vehicle Type utilization
    const types = ['Semi-Truck', 'Box Truck', 'Cargo Van', 'Flatbed'];
    const vehicleSplit = types.map(t => {
      const filtered = db.vehicles.filter(v => v.type === t);
      return {
        _id: t,
        total: filtered.length,
        available: filtered.filter(v => v.availability).length
      };
    });

    // 5. Recent notifications
    let notifs = [...db.notifications];
    if (req.user.role === 'Driver') {
      notifs = notifs.filter(n => n.recipient?.toString() === req.user.id.toString() || n.recipientRole === 'Driver' || n.recipientRole === 'All');
    } else if (req.user.role === 'Dispatcher') {
      notifs = notifs.filter(n => n.recipient?.toString() === req.user.id.toString() || n.recipientRole === 'Dispatcher' || n.recipientRole === 'All');
    } else if (req.user.role === 'Warehouse Manager') {
      notifs = notifs.filter(n => n.recipient?.toString() === req.user.id.toString() || n.recipientRole === 'Warehouse Manager' || n.recipientRole === 'All');
    }
    const notifications = notifs.slice(0, 10);

    // 6. Recent activities
    const activities = db.activities.slice(0, 15);

    return sendSuccess(res, {
      statusSplit,
      prioritySplit,
      deliveriesOverTime,
      vehicleSplit,
      notifications,
      activities,
    });
  }
};

// Simulation tick in memory
const simulateTransitTick = (io) => {
  let updated = false;
  db.shipments.forEach(shipment => {
    if (shipment.status !== 'In Transit') return;
    const route = shipment.routeCoordinates;
    if (!route || route.length === 0) return;

    // Find current position index in route
    let currentIndex = -1;
    const curr = shipment.currentCoordinates;
    if (curr && curr.lat) {
      let minDistance = Infinity;
      for (let i = 0; i < route.length; i++) {
        const dist = Math.pow(route[i].lat - curr.lat, 2) + Math.pow(route[i].lng - curr.lng, 2);
        if (dist < minDistance) {
          minDistance = dist;
          currentIndex = i;
        }
      }
    }

    let nextIndex = currentIndex + 1;
    if (nextIndex >= route.length) {
      nextIndex = route.length - 1;
    }

    const nextCoord = route[nextIndex];
    shipment.currentCoordinates = { lat: nextCoord.lat, lng: nextCoord.lng };

    let updatedFuel = 100;
    if (shipment.vehicle) {
      const vehicle = db.vehicles.find(v => v._id.toString() === shipment.vehicle.toString());
      if (vehicle) {
        vehicle.currentLocation = { lat: nextCoord.lat, lng: nextCoord.lng, address: `En route to ${shipment.destination.name}` };
        vehicle.fuelStatus = Math.max(5, vehicle.fuelStatus - (Math.random() * 1.5));
        updatedFuel = vehicle.fuelStatus;
      }
    }

    updated = true;

    // Dispatch WebSocket event
    if (io) {
      const dName = db.users.find(u => u._id.toString() === shipment.driver?.toString())?.name || 'Driver';
      const payload = {
        shipmentId: shipment.shipmentId,
        id: shipment._id,
        coordinates: { lat: nextCoord.lat, lng: nextCoord.lng },
        destination: shipment.destination.name,
        driverName: dName,
        fuelStatus: Math.round(updatedFuel),
        progress: Math.round((nextIndex / (route.length - 1)) * 100),
        speed: nextIndex === route.length - 1 ? 0 : Math.round(55 + Math.random() * 10)
      };
      io.to(`shipment:${shipment._id}`).emit('location:update', payload);
      io.emit('location:update:global', payload);
    }
  });

  if (updated) {
    saveDb();
  }
};

module.exports = {
  db,
  isMockDB: true,
  simulateTransitTick,
  auth: mockAuth,
  shipments: mockShipments,
  vehicles: mockVehicles,
  drivers: mockDrivers,
  analytics: mockAnalytics,
  loadDb,
  saveDb
};
