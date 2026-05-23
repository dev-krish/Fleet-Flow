const Shipment = require('../models/Shipment');
const Vehicle = require('../models/Vehicle');

let intervalId = null;
let ioInstance = null;

const startSimulator = (io) => {
  ioInstance = io;
  if (intervalId) return;

  console.log('Location Tracking Simulator started.');
  intervalId = setInterval(async () => {
    try {
      if (global.isMockDB) {
        const mockDb = require('../utils/mockDb');
        mockDb.simulateTransitTick(ioInstance);
        return;
      }

      // Find all In Transit shipments
      const activeShipments = await Shipment.find({ status: 'In Transit' })
        .populate('vehicle')
        .populate('driver', 'name');

      if (activeShipments.length === 0) return;

      for (let shipment of activeShipments) {
        const route = shipment.routeCoordinates;
        if (!route || route.length === 0) continue;

        // Find current position index
        let currentIndex = -1;
        const curr = shipment.currentCoordinates;

        if (curr && curr.lat) {
          // Find closest coordinate in route
          let minDistance = Infinity;
          for (let i = 0; i < route.length; i++) {
            const dist = Math.pow(route[i].lat - curr.lat, 2) + Math.pow(route[i].lng - curr.lng, 2);
            if (dist < minDistance) {
              minDistance = dist;
              currentIndex = i;
            }
          }
        }

        // Determine next coordinate index
        let nextIndex = currentIndex + 1;
        if (nextIndex >= route.length) {
          // Already reached destination, keep it there or slightly fluctuate
          nextIndex = route.length - 1;
        }

        const nextCoord = route[nextIndex];
        
        // Update shipment current location
        shipment.currentCoordinates = {
          lat: nextCoord.lat,
          lng: nextCoord.lng,
        };

        // Simulated fuel drainage & location updates for vehicle
        let updatedFuel = 100;
        if (shipment.vehicle) {
          const vehicle = await Vehicle.findById(shipment.vehicle._id);
          if (vehicle) {
            vehicle.currentLocation = {
              lat: nextCoord.lat,
              lng: nextCoord.lng,
              address: `En route to ${shipment.destination.name}`,
            };
            // Drain fuel slowly (e.g. 0.5% per step, min 5)
            vehicle.fuelStatus = Math.max(5, vehicle.fuelStatus - (Math.random() * 1.5));
            updatedFuel = vehicle.fuelStatus;
            await vehicle.save();
          }
        }

        await shipment.save();

        // Broadcast to specific shipment room and global tracking room
        const socketPayload = {
          shipmentId: shipment.shipmentId,
          id: shipment._id,
          coordinates: { lat: nextCoord.lat, lng: nextCoord.lng },
          destination: shipment.destination.name,
          driverName: shipment.driver ? shipment.driver.name : 'Unknown',
          fuelStatus: Math.round(updatedFuel),
          progress: Math.round((nextIndex / (route.length - 1)) * 100),
          speed: nextIndex === route.length - 1 ? 0 : Math.round(55 + Math.random() * 10), // MPH
        };

        if (ioInstance) {
          // Emit to tracking rooms
          ioInstance.to(`shipment:${shipment._id}`).emit('location:update', socketPayload);
          ioInstance.emit('location:update:global', socketPayload);
        }
      }
    } catch (error) {
      console.error('Simulator tick error:', error);
    }
  }, 8000); // Trigger updates every 8 seconds
};

const stopSimulator = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Location Tracking Simulator stopped.');
  }
};

module.exports = {
  startSimulator,
  stopSimulator,
};
