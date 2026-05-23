const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Shipment = require('../models/Shipment');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const locations = {
  los_angeles: { name: 'LA Logistics Hub', lat: 34.0522, lng: -118.2437, address: '1200 S Alameda St, Los Angeles, CA 90021' },
  san_francisco: { name: 'SF Port Terminal', lat: 37.7749, lng: -122.4194, address: 'Pier 27, The Embarcadero, San Francisco, CA 94111' },
  san_diego: { name: 'San Diego Depot', lat: 32.7157, lng: -117.1611, address: '2200 Belt St, San Diego, CA 92113' },
  sacramento: { name: 'Sacramento Assembly Plant', lat: 38.5816, lng: -121.4944, address: '8400 Elder Creek Rd, Sacramento, CA 95828' },
  las_vegas: { name: 'Nevada Distribution Hub', lat: 36.1716, lng: -115.1398, address: '4400 E Pecos Rd, Las Vegas, NV 89115' },
  phoenix: { name: 'Arizona Freight Center', lat: 33.4484, lng: -112.0740, address: '3000 W Buckeye Rd, Phoenix, AZ 85009' },
  fresno: { name: 'Central Valley Warehouse', lat: 36.7378, lng: -119.7871, address: '2600 E Central Ave, Fresno, CA 93725' },
  san_jose: { name: 'Silicon Valley Fulfillment', lat: 37.3382, lng: -121.8863, address: '1500 S 10th St, San Jose, CA 95112' }
};

// Route interpolation helpers
const generateRoutePoints = (from, to, pointsCount = 10) => {
  const points = [];
  for (let i = 0; i <= pointsCount; i++) {
    const ratio = i / pointsCount;
    const lat = from.lat + (to.lat - from.lat) * ratio;
    const lng = from.lng + (to.lng - from.lng) * ratio;
    points.push({ lat, lng });
  }
  return points;
};

const runSeeder = async () => {
  let dbConnected = false;
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fleetflow';
    console.log(`Connecting to database at ${mongoUri} for seeding...`);
    
    // Set 3 second timeout for quick fallback checking
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    dbConnected = true;
    console.log('Connected to MongoDB. Clearing database...');
    
    await User.deleteMany({});
    await Driver.deleteMany({});
    await Vehicle.deleteMany({});
    await Shipment.deleteMany({});
    await Notification.deleteMany({});
    await ActivityLog.deleteMany({});
  } catch (error) {
    console.log(`MongoDB connection failed (${error.message}). Falling back to JSON-file mock seeder...`);
  }

  try {
    // Ensure upload directory exists
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const mockImagePath = path.join(uploadDir, 'mock_pod.jpg');
    if (!fs.existsSync(mockImagePath)) {
      fs.writeFileSync(mockImagePath, 'MOCK_IMAGE_DATA');
    }

    // Prepare seed data
    console.log('Generating seed data details...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const rawUsers = [
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Johnathan Admin',
        email: 'admin@fleetflow.com',
        password: hashedPassword,
        role: 'Admin',
        phone: '+1 (555) 100-2001',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
        refreshTokens: [],
        status: 'Active',
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Sarah Dispatcher',
        email: 'dispatcher@fleetflow.com',
        password: hashedPassword,
        role: 'Dispatcher',
        phone: '+1 (555) 100-2002',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
        refreshTokens: [],
        status: 'Active',
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Marcus Warehouse',
        email: 'warehouse@fleetflow.com',
        password: hashedPassword,
        role: 'Warehouse Manager',
        phone: '+1 (555) 100-2003',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
        refreshTokens: [],
        status: 'Active',
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Robert Miller',
        email: 'driver@fleetflow.com',
        password: hashedPassword,
        role: 'Driver',
        phone: '+1 (555) 100-2004',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
        refreshTokens: [],
        status: 'Active',
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Carlos Gomez',
        email: 'driver2@fleetflow.com',
        password: hashedPassword,
        role: 'Driver',
        phone: '+1 (555) 100-2005',
        avatar: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=150&h=150&q=80',
        refreshTokens: [],
        status: 'Active',
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'David Wilson',
        email: 'driver3@fleetflow.com',
        password: hashedPassword,
        role: 'Driver',
        phone: '+1 (555) 100-2006',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
        refreshTokens: [],
        status: 'Active',
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Emily Davis',
        email: 'driver4@fleetflow.com',
        password: hashedPassword,
        role: 'Driver',
        phone: '+1 (555) 100-2007',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
        refreshTokens: [],
        status: 'Active',
      },
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'James Chen',
        email: 'driver5@fleetflow.com',
        password: hashedPassword,
        role: 'Driver',
        phone: '+1 (555) 100-2008',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
        refreshTokens: [],
        status: 'Active',
      }
    ];

    const rawVehicles = [
      {
        _id: new mongoose.Types.ObjectId(),
        vehicleNumber: 'V-FL-5501',
        type: 'Semi-Truck',
        capacity: 18000,
        fuelStatus: 85,
        currentLocation: { lat: 34.0522, lng: -118.2437, address: 'LA Logistics Hub' },
        maintenanceStatus: 'Satisfactory',
        availability: false,
        assignedDriver: rawUsers[3]._id,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        vehicleNumber: 'V-FL-5502',
        type: 'Semi-Truck',
        capacity: 20000,
        fuelStatus: 42,
        currentLocation: { lat: 36.7378, lng: -119.7871, address: 'Fresno Depot Yard' },
        maintenanceStatus: 'Service Due',
        availability: false,
        assignedDriver: rawUsers[4]._id,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        vehicleNumber: 'V-FL-3301',
        type: 'Box Truck',
        capacity: 8000,
        fuelStatus: 95,
        currentLocation: { lat: 37.7749, lng: -122.4194, address: 'SF Port Terminal' },
        maintenanceStatus: 'Satisfactory',
        availability: false,
        assignedDriver: rawUsers[5]._id,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        vehicleNumber: 'V-FL-1201',
        type: 'Cargo Van',
        capacity: 2000,
        fuelStatus: 15,
        currentLocation: { lat: 32.7157, lng: -117.1611, address: 'San Diego Depot' },
        maintenanceStatus: 'Under Repair',
        availability: false,
        assignedDriver: rawUsers[6]._id,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        vehicleNumber: 'V-FL-5503',
        type: 'Semi-Truck',
        capacity: 19000,
        fuelStatus: 92,
        currentLocation: { lat: 34.0522, lng: -118.2437, address: 'LA Logistics Hub' },
        maintenanceStatus: 'Satisfactory',
        availability: true,
        assignedDriver: null,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        vehicleNumber: 'V-FL-4401',
        type: 'Flatbed',
        capacity: 12000,
        fuelStatus: 78,
        currentLocation: { lat: 37.3382, lng: -121.8863, address: 'Silicon Valley Fulfillment' },
        maintenanceStatus: 'Satisfactory',
        availability: true,
        assignedDriver: null,
      }
    ];

    const rawDrivers = [
      {
        _id: new mongoose.Types.ObjectId(),
        user: rawUsers[3]._id,
        licenseNumber: 'CDL-CA-99201',
        experience: 8,
        status: 'On Duty',
        assignedVehicle: rawVehicles[0]._id,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        user: rawUsers[4]._id,
        licenseNumber: 'CDL-CA-33820',
        experience: 12,
        status: 'On Duty',
        assignedVehicle: rawVehicles[1]._id,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        user: rawUsers[5]._id,
        licenseNumber: 'CDL-CA-11209',
        experience: 5,
        status: 'On Duty',
        assignedVehicle: rawVehicles[2]._id,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        user: rawUsers[6]._id,
        licenseNumber: 'CDL-CA-44910',
        experience: 3,
        status: 'Offline',
        assignedVehicle: rawVehicles[3]._id,
      },
      {
        _id: new mongoose.Types.ObjectId(),
        user: rawUsers[7]._id,
        licenseNumber: 'CDL-NV-88710',
        experience: 6,
        status: 'Available',
        assignedVehicle: null,
      }
    ];

    const today = new Date();
    const pathLA_SF = generateRoutePoints(locations.los_angeles, locations.san_francisco, 15);
    const pathPH_LV = generateRoutePoints(locations.phoenix, locations.las_vegas, 15);
    const pathSD_LA = generateRoutePoints(locations.san_diego, locations.los_angeles, 10);
    const pathSAC_FRE = generateRoutePoints(locations.sacramento, locations.fresno, 12);
    const pathSJ_SD = generateRoutePoints(locations.san_jose, locations.san_diego, 15);
    const pathLA_LV = generateRoutePoints(locations.los_angeles, locations.las_vegas, 12);
    const pathSF_SAC = generateRoutePoints(locations.san_francisco, locations.sacramento, 8);
    const pathFRE_SJ = generateRoutePoints(locations.fresno, locations.san_jose, 8);

    const rawShipments = [
      {
        _id: new mongoose.Types.ObjectId(),
        shipmentId: 'FF-10001',
        origin: locations.los_angeles,
        destination: locations.san_francisco,
        status: 'In Transit',
        priority: 'Critical',
        vehicle: rawVehicles[0]._id,
        driver: rawUsers[3]._id,
        warehouseManager: rawUsers[2]._id,
        scheduledDeliveryDate: new Date(today.getTime() + 1000 * 60 * 60 * 6),
        estimatedDeliveryTime: new Date(today.getTime() + 1000 * 60 * 60 * 5.5),
        dimensions: { weight: 12000, volume: 45 },
        routeCoordinates: pathLA_SF,
        currentCoordinates: pathLA_SF[4],
        statusHistory: [
          { status: 'Pending', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 4), updatedBy: rawUsers[2]._id, reason: 'Order placed by production dept' },
          { status: 'Assigned', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 3), updatedBy: rawUsers[1]._id, reason: 'Assigned to Robert Miller and Semi-Truck V-FL-5501' },
          { status: 'In Transit', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 1), updatedBy: rawUsers[3]._id, reason: 'Departed Los Angeles Depot' }
        ],
        comments: []
      },
      {
        _id: new mongoose.Types.ObjectId(),
        shipmentId: 'FF-10002',
        origin: locations.phoenix,
        destination: locations.las_vegas,
        status: 'Delayed',
        priority: 'High',
        vehicle: rawVehicles[1]._id,
        driver: rawUsers[4]._id,
        warehouseManager: rawUsers[2]._id,
        scheduledDeliveryDate: new Date(today.getTime() - 1000 * 60 * 60 * 2),
        estimatedDeliveryTime: new Date(today.getTime() + 1000 * 60 * 60 * 3),
        dimensions: { weight: 15500, volume: 52 },
        routeCoordinates: pathPH_LV,
        currentCoordinates: pathPH_LV[6],
        statusHistory: [
          { status: 'Pending', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 12), updatedBy: rawUsers[2]._id, reason: 'Parts ready for distribution' },
          { status: 'Assigned', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 10), updatedBy: rawUsers[1]._id, reason: 'Assigned vehicle V-FL-5502' },
          { status: 'In Transit', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 6), updatedBy: rawUsers[4]._id, reason: 'En route' },
          { status: 'Delayed', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 1.5), updatedBy: rawUsers[4]._id, reason: 'Heavy traffic delays and minor engine diagnostics check' }
        ],
        comments: []
      },
      {
        _id: new mongoose.Types.ObjectId(),
        shipmentId: 'FF-10003',
        origin: locations.san_diego,
        destination: locations.los_angeles,
        status: 'Delivered',
        priority: 'Medium',
        vehicle: rawVehicles[2]._id,
        driver: rawUsers[5]._id,
        warehouseManager: rawUsers[2]._id,
        scheduledDeliveryDate: new Date(today.getTime() - 1000 * 60 * 60 * 4),
        estimatedDeliveryTime: new Date(today.getTime() - 1000 * 60 * 60 * 4.5),
        actualDeliveryTime: new Date(today.getTime() - 1000 * 60 * 60 * 4.2),
        dimensions: { weight: 4500, volume: 18 },
        routeCoordinates: pathSD_LA,
        currentCoordinates: locations.los_angeles,
        proofOfDelivery: {
          imageUrl: '/uploads/mock_pod.jpg',
          signedBy: 'Supervisor Adams',
          timestamp: new Date(today.getTime() - 1000 * 60 * 60 * 4.2)
        },
        statusHistory: [
          { status: 'Pending', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 8), updatedBy: rawUsers[2]._id },
          { status: 'Assigned', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 7), updatedBy: rawUsers[1]._id },
          { status: 'In Transit', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 6), updatedBy: rawUsers[5]._id },
          { status: 'Delivered', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 4.2), updatedBy: rawUsers[5]._id, reason: 'Signed by warehouse supervisor at unloading gate' }
        ],
        comments: []
      },
      {
        _id: new mongoose.Types.ObjectId(),
        shipmentId: 'FF-10004',
        origin: locations.sacramento,
        destination: locations.fresno,
        status: 'Assigned',
        priority: 'Low',
        vehicle: rawVehicles[1]._id,
        driver: rawUsers[4]._id,
        warehouseManager: rawUsers[2]._id,
        scheduledDeliveryDate: new Date(today.getTime() + 1000 * 60 * 60 * 24),
        estimatedDeliveryTime: new Date(today.getTime() + 1000 * 60 * 60 * 27),
        dimensions: { weight: 8000, volume: 30 },
        routeCoordinates: pathSAC_FRE,
        currentCoordinates: locations.sacramento,
        statusHistory: [
          { status: 'Pending', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 2), updatedBy: rawUsers[2]._id },
          { status: 'Assigned', updatedAt: new Date(today.getTime() - 1000 * 60 * 30), updatedBy: rawUsers[1]._id, reason: 'Assigned to Carlos Gomez for next-day dispatch' }
        ],
        comments: []
      },
      {
        _id: new mongoose.Types.ObjectId(),
        shipmentId: 'FF-10005',
        origin: locations.san_jose,
        destination: locations.san_diego,
        status: 'Pending',
        priority: 'High',
        warehouseManager: rawUsers[2]._id,
        scheduledDeliveryDate: new Date(today.getTime() + 1000 * 60 * 60 * 18),
        dimensions: { weight: 9500, volume: 35 },
        routeCoordinates: pathSJ_SD,
        currentCoordinates: locations.san_jose,
        statusHistory: [
          { status: 'Pending', updatedAt: new Date(), updatedBy: rawUsers[2]._id, reason: 'Pending vehicle capacity allocation' }
        ],
        comments: []
      },
      {
        _id: new mongoose.Types.ObjectId(),
        shipmentId: 'FF-10006',
        origin: locations.los_angeles,
        destination: locations.las_vegas,
        status: 'Pending',
        priority: 'Medium',
        warehouseManager: rawUsers[2]._id,
        scheduledDeliveryDate: new Date(today.getTime() + 1000 * 60 * 60 * 36),
        dimensions: { weight: 14000, volume: 48 },
        routeCoordinates: pathLA_LV,
        currentCoordinates: locations.los_angeles,
        statusHistory: [{ status: 'Pending', updatedAt: new Date(), updatedBy: rawUsers[2]._id }],
        comments: []
      },
      {
        _id: new mongoose.Types.ObjectId(),
        shipmentId: 'FF-10007',
        origin: locations.san_francisco,
        destination: locations.sacramento,
        status: 'Cancelled',
        priority: 'Low',
        warehouseManager: rawUsers[2]._id,
        scheduledDeliveryDate: new Date(today.getTime() - 1000 * 60 * 60 * 24),
        dimensions: { weight: 2000, volume: 8 },
        routeCoordinates: pathSF_SAC,
        currentCoordinates: locations.san_francisco,
        statusHistory: [
          { status: 'Pending', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 30), updatedBy: rawUsers[2]._id },
          { status: 'Cancelled', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 20), updatedBy: rawUsers[0]._id, reason: 'Order canceled by manufacturing unit' }
        ],
        comments: []
      },
      {
        _id: new mongoose.Types.ObjectId(),
        shipmentId: 'FF-10008',
        origin: locations.fresno,
        destination: locations.san_jose,
        status: 'Delivered',
        priority: 'High',
        vehicle: rawVehicles[0]._id,
        driver: rawUsers[3]._id,
        warehouseManager: rawUsers[2]._id,
        scheduledDeliveryDate: new Date(today.getTime() - 1000 * 60 * 60 * 48),
        estimatedDeliveryTime: new Date(today.getTime() - 1000 * 60 * 60 * 47),
        actualDeliveryTime: new Date(today.getTime() - 1000 * 60 * 60 * 47.5),
        dimensions: { weight: 11000, volume: 40 },
        routeCoordinates: pathFRE_SJ,
        currentCoordinates: locations.san_jose,
        proofOfDelivery: {
          imageUrl: '/uploads/mock_pod.jpg',
          signedBy: 'Clerk Henderson',
          timestamp: new Date(today.getTime() - 1000 * 60 * 60 * 47.5)
        },
        statusHistory: [
          { status: 'Pending', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 56), updatedBy: rawUsers[2]._id },
          { status: 'Assigned', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 54), updatedBy: rawUsers[1]._id },
          { status: 'In Transit', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 51), updatedBy: rawUsers[3]._id },
          { status: 'Delivered', updatedAt: new Date(today.getTime() - 1000 * 60 * 60 * 47.5), updatedBy: rawUsers[3]._id, reason: 'Successfully unloaded' }
        ],
        comments: []
      }
    ];

    const rawNotifications = [
      {
        _id: new mongoose.Types.ObjectId(),
        recipient: rawUsers[3]._id,
        recipientRole: 'Driver',
        title: 'New Shipment Assigned',
        message: 'You have been assigned to Shipment FF-10001 (Los Angeles to San Francisco).',
        type: 'SHIPMENT_ASSIGNED',
        readBy: [],
        metadata: { shipmentId: rawShipments[0]._id },
        createdAt: new Date(today.getTime() - 1000 * 60 * 30)
      },
      {
        _id: new mongoose.Types.ObjectId(),
        recipientRole: 'Dispatcher',
        title: 'Shipment Delayed Alert',
        message: 'Shipment FF-10002 is marked as delayed due to traffic checks.',
        type: 'SHIPMENT_DELAYED',
        readBy: [],
        metadata: { shipmentId: rawShipments[1]._id },
        createdAt: new Date(today.getTime() - 1000 * 60 * 15)
      },
      {
        _id: new mongoose.Types.ObjectId(),
        recipientRole: 'Warehouse Manager',
        title: 'Shipment Delivered',
        message: 'Shipment FF-10003 (San Diego to Los Angeles) has been successfully delivered.',
        type: 'SHIPMENT_DELIVERED',
        readBy: [],
        metadata: { shipmentId: rawShipments[2]._id },
        createdAt: new Date(today.getTime() - 1000 * 60 * 45)
      },
      {
        _id: new mongoose.Types.ObjectId(),
        recipientRole: 'Admin',
        title: 'Vehicle Maintenance Warning',
        message: 'Vehicle V-FL-1201 is currently Under Repair.',
        type: 'MAINTENANCE_DUE',
        readBy: [],
        metadata: { vehicleNumber: 'V-FL-1201' },
        createdAt: new Date(today.getTime() - 1000 * 60 * 60)
      }
    ];

    const rawActivities = [
      {
        _id: new mongoose.Types.ObjectId(),
        user: rawUsers[0]._id,
        action: 'SYSTEM_SEEDED',
        details: 'System database seeded with initial fleet, user, and route configurations.',
        ipAddress: '127.0.0.1',
        createdAt: new Date(today.getTime() - 1000 * 60 * 120)
      },
      {
        _id: new mongoose.Types.ObjectId(),
        user: rawUsers[2]._id,
        action: 'CREATED_SHIPMENT',
        details: 'Created Shipment FF-10001 targeting SF Port Terminal.',
        ipAddress: '192.168.1.15',
        createdAt: new Date(today.getTime() - 1000 * 60 * 100)
      },
      {
        _id: new mongoose.Types.ObjectId(),
        user: rawUsers[1]._id,
        action: 'ASSIGNED_VEHICLE',
        details: 'Assigned Driver Robert Miller and Vehicle V-FL-5501 to Shipment FF-10001.',
        ipAddress: '192.168.1.20',
        createdAt: new Date(today.getTime() - 1000 * 60 * 80)
      }
    ];

    // If connected, save to mongo
    if (dbConnected) {
      console.log('Writing records to MongoDB...');
      await User.insertMany(rawUsers);
      await Vehicle.insertMany(rawVehicles);
      await Driver.insertMany(rawDrivers);
      await Shipment.insertMany(rawShipments);
      await Notification.insertMany(rawNotifications);
      await ActivityLog.insertMany(rawActivities);
      console.log('Seeded database successfully.');
    }

    // Always write to JSON fallback so it's ready for local-only execution
    const mockDbPath = path.join(__dirname, '../config/mock_db_data.json');
    const mockPayload = {
      users: rawUsers,
      vehicles: rawVehicles,
      drivers: rawDrivers,
      shipments: rawShipments,
      notifications: rawNotifications,
      activities: rawActivities
    };

    console.log(`Writing seed payload to JSON file fallback: ${mockDbPath}`);
    fs.writeFileSync(mockDbPath, JSON.stringify(mockPayload, null, 2));
    console.log('JSON seeder file generated successfully.');
    
    process.exit(0);
  } catch (err) {
    console.error('Fatal error in seeding execution:', err);
    process.exit(1);
  }
};

runSeeder();
