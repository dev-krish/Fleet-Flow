import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import shipmentService from '../services/shipmentService';
import { MapSkeleton } from '../components/Skeletons';
import { Compass, Truck, Navigation, Fuel, Gauge, User, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Create styled Custom HTML Div Icons for Map Markers (Avoid default Leaflet asset path resolution breaks)
const createMarkerIcon = (color = '#3b82f6', isDelayed = false) => {
  const bg = isDelayed ? 'bg-amber-500' : 'bg-blue-600';
  const border = isDelayed ? 'border-amber-200' : 'border-blue-200';
  
  return L.divIcon({
    html: `
      <div class="h-9 w-9 rounded-full ${bg} border-2 border-white shadow-xl flex items-center justify-center text-white animate-pulse relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125a1.125 1.125 0 0 0 1.125-1.125V9.75M3.75 12h16.5M4.5 19.5h15m-15-3v-6a2.25 2.25 0 0 1 2.25-2.25h10.5A2.25 2.25 0 0 1 18 10.5v6" />
        </svg>
      </div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const createTerminalIcon = (color = '#ef4444') => {
  return L.divIcon({
    html: `
      <div class="h-6 w-6 rounded-full bg-rose-500 border-2 border-white shadow-md flex items-center justify-center text-white">
        <div class="h-2 w-2 rounded-full bg-white animate-ping"></div>
      </div>
    `,
    className: 'custom-terminal-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const LiveTracking = () => {
  const { socket } = useSocket();
  const [activeShipments, setActiveShipments] = useState([]);
  const [livePositions, setLivePositions] = useState({});
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchActiveShipments = async () => {
    try {
      // Find In Transit or Delayed shipments
      const data = await shipmentService.getShipments();
      const active = (data.shipments || []).filter(s => ['In Transit', 'Delayed'].includes(s.status));
      setActiveShipments(active);

      // Initialize livePositions state with DB values
      const initialPositions = {};
      active.forEach(s => {
        initialPositions[s._id] = {
          id: s._id,
          shipmentId: s.shipmentId,
          coordinates: s.currentCoordinates,
          destination: s.destination.name,
          driverName: s.driver ? s.driver.name : 'Unknown',
          fuelStatus: s.vehicle ? s.vehicle.fuelStatus : 100,
          speed: s.status === 'Delayed' ? 0 : 55,
          progress: 25
        };
      });
      setLivePositions(initialPositions);

      // Set default selected shipment
      if (active.length > 0) {
        setSelectedShipment(active[0]);
      }
    } catch (err) {
      console.error('Error loading active shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveShipments();
  }, []);

  // Listen to live GPS position updates from socket
  useEffect(() => {
    if (!socket) return;

    socket.on('location:update:global', (data) => {
      // Update coordinates dynamically in state
      setLivePositions(prev => ({
        ...prev,
        [data.id]: data
      }));
    });

    return () => {
      socket.off('location:update:global');
    };
  }, [socket]);

  const handleSelectShipment = (ship) => {
    setSelectedShipment(ship);
  };

  if (loading) {
    return <MapSkeleton />;
  }

  // Get current active shipment positions
  const getSelectedPosition = () => {
    if (!selectedShipment || !livePositions[selectedShipment._id]) return null;
    return livePositions[selectedShipment._id].coordinates;
  };

  const selectedPos = getSelectedPosition() || { lat: 34.0522, lng: -118.2437 };

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      
      {/* LEFT BOARD: ACTIVE TRIP STATUS CARD */}
      <div className="w-80 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shrink-0 overflow-y-auto">
        <h3 className="font-bold text-sm text-slate-850 dark:text-slate-200 mb-4 flex items-center gap-1.5 border-b pb-2">
          <Compass className="h-4 w-4 text-brand-650" /> Active GPS Shipments
        </h3>

        {activeShipments.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 py-20">
            <Truck className="h-10 w-10 text-slate-350 dark:text-slate-850 mb-2" />
            <span className="text-xs font-semibold">No transit shipments live.</span>
            <span className="text-[10px] text-slate-550 mt-0.5">Start a trip in the Driver portal.</span>
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {activeShipments.map((ship) => {
              const live = livePositions[ship._id] || {};
              const isSelected = selectedShipment?._id === ship._id;
              
              return (
                <div
                  key={ship._id}
                  onClick={() => handleSelectShipment(ship)}
                  className={`p-4 border rounded-xl cursor-pointer hover:shadow-sm transition-all text-xs space-y-3 ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/10 dark:bg-brand-950/10'
                      : 'border-slate-250 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {/* Title & Speed */}
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 dark:text-white">{ship.shipmentId}</span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Navigation className="h-3 w-3 rotate-45 text-blue-500" />
                      {live.speed !== undefined ? live.speed : 0} mph
                    </span>
                  </div>

                  {/* Route details */}
                  <div>
                    <div className="font-semibold text-slate-700 dark:text-slate-350 truncate">
                      {ship.origin.name} → {ship.destination.name}
                    </div>
                  </div>

                  {/* Fuel & Progress Meters */}
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[10px] text-slate-500">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1"><Fuel className="h-3.5 w-3.5" /> Fuel level</span>
                      <span className="font-semibold text-slate-750 dark:text-slate-350">{live.fuelStatus ? Math.round(live.fuelStatus) : 100}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> Progress</span>
                      <span className="font-semibold text-slate-750 dark:text-slate-350">{live.progress || 0}%</span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT BOARD: INTERACTIVE LEAFLET MAP VIEW */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm relative z-10">
        <MapContainer
          center={[selectedPos.lat, selectedPos.lng]}
          zoom={6}
          scrollWheelZoom={true}
        >
          {/* Base Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render Route Polyline for Selected Shipment */}
          {selectedShipment && selectedShipment.routeCoordinates && (
            <>
              {/* Origin Terminal */}
              <Marker
                position={[selectedShipment.origin.lat, selectedShipment.origin.lng]}
                icon={createTerminalIcon('#10b981')}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>Pickup Depot:</strong> {selectedShipment.origin.name}
                  </div>
                </Popup>
              </Marker>

              {/* Destination Terminal */}
              <Marker
                position={[selectedShipment.destination.lat, selectedShipment.destination.lng]}
                icon={createTerminalIcon('#ef4444')}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>Delivery Terminal:</strong> {selectedShipment.destination.name}
                  </div>
                </Popup>
              </Marker>

              {/* Active Route Polyline */}
              <Polyline
                pathOptions={{ color: selectedShipment.status === 'Delayed' ? '#f59e0b' : '#3b82f6', weight: 4, dashArray: '8, 8' }}
                positions={selectedShipment.routeCoordinates.map(c => [c.lat, c.lng])}
              />
            </>
          )}

          {/* Render Active Truck Markers */}
          {Object.keys(livePositions).map((id) => {
            const live = livePositions[id];
            const isDelayed = activeShipments.find(s => s._id === id)?.status === 'Delayed';
            
            return (
              <Marker
                key={id}
                position={[live.coordinates.lat, live.coordinates.lng]}
                icon={createMarkerIcon('#2563eb', isDelayed)}
              >
                <Popup>
                  <div className="text-xs space-y-1.5 min-w-[150px]">
                    <div className="font-bold text-sm text-slate-800 border-b pb-1">
                      Shipment {live.shipmentId}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <User className="h-3.5 w-3.5" /> Driver: <strong>{live.driverName}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <MapPin className="h-3.5 w-3.5" /> Target: <strong>{live.destination}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Fuel className="h-3.5 w-3.5" /> Fuel level: <strong>{live.fuelStatus}%</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Navigation className="h-3.5 w-3.5 rotate-45" /> Speed: <strong>{live.speed} mph</strong>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

    </div>
  );
};

export default LiveTracking;
