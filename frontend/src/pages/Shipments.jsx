import React, { useState, useEffect } from 'react';
import shipmentService from '../services/shipmentService';
import vehicleService from '../services/vehicleService';
import driverService from '../services/driverService';
import { TableSkeleton } from '../components/Skeletons';
import { useAuth } from '../hooks/useAuth';
import {
  Search,
  Filter,
  Plus,
  ArrowRightLeft,
  ChevronRight,
  Send,
  Trash2,
  Calendar,
  AlertCircle,
  X,
  FileCheck
} from 'lucide-react';

const Shipments = () => {
  const { user } = useAuth();
  const canDispatch = user?.role === 'Admin' || user?.role === 'Dispatcher';
  const canCreate = canDispatch || user?.role === 'Warehouse Manager';

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState(null);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Form states - Create Shipment
  const [originKey, setOriginKey] = useState('los_angeles');
  const [destKey, setDestKey] = useState('san_francisco');
  const [scheduledDate, setScheduledDate] = useState('');
  const [shipPriority, setShipPriority] = useState('Medium');
  const [weight, setWeight] = useState(5000);
  const [volume, setVolume] = useState(20);

  // Form states - Assign
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');

  // Comment state
  const [commentText, setCommentText] = useState('');

  const cityPresets = {
    los_angeles: { name: 'LA Logistics Hub', lat: 34.0522, lng: -118.2437, address: '1200 S Alameda St, Los Angeles, CA' },
    san_francisco: { name: 'SF Port Terminal', lat: 37.7749, lng: -122.4194, address: 'Pier 27, The Embarcadero, San Francisco, CA' },
    san_diego: { name: 'San Diego Depot', lat: 32.7157, lng: -117.1611, address: '2200 Belt St, San Diego, CA' },
    sacramento: { name: 'Sacramento Assembly Plant', lat: 38.5816, lng: -121.4944, address: '8400 Elder Creek Rd, Sacramento, CA' },
    las_vegas: { name: 'Nevada Distribution Hub', lat: 36.1716, lng: -115.1398, address: '4400 E Pecos Rd, Las Vegas, NV' },
    phoenix: { name: 'Arizona Freight Center', lat: 33.4484, lng: -112.0740, address: '3000 W Buckeye Rd, Phoenix, AZ' },
    fresno: { name: 'Central Valley Warehouse', lat: 36.7378, lng: -119.7871, address: '2600 E Central Ave, Fresno, CA' },
    san_jose: { name: 'Silicon Valley Fulfillment', lat: 37.3382, lng: -121.8863, address: '1500 S 10th St, San Jose, CA' }
  };

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (search) filters.search = search;
      if (status) filters.status = status;
      if (priority) filters.priority = priority;

      const data = await shipmentService.getShipments(filters);
      setShipments(data.shipments || []);
      
      // If currently selected shipment, refresh its detail panel
      if (selectedShipment) {
        const freshDetail = await shipmentService.getShipmentById(selectedShipment._id);
        setSelectedShipment(freshDetail);
      }
    } catch (error) {
      console.error('Error listing shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [status, priority]); // Refetch on dropdown filter triggers

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchShipments();
  };

  const handleSelectShipment = async (ship) => {
    try {
      const detail = await shipmentService.getShipmentById(ship._id);
      setSelectedShipment(detail);
    } catch (err) {
      console.error('Error fetching shipment details:', err);
    }
  };

  const handleCreateShipment = async (e) => {
    e.preventDefault();
    if (!scheduledDate) return;

    try {
      await shipmentService.createShipment({
        origin: cityPresets[originKey],
        destination: cityPresets[destKey],
        scheduledDeliveryDate: new Date(scheduledDate),
        priority: shipPriority,
        dimensions: { weight: Number(weight), volume: Number(volume) }
      });
      setCreateModalOpen(false);
      fetchShipments();
    } catch (err) {
      console.error('Create shipment failed:', err);
    }
  };

  const openAssignModal = async (shipment) => {
    setSelectedShipment(shipment);
    try {
      const [vehiclesData, driversData] = await Promise.all([
        vehicleService.getVehicles({ availability: true }),
        driverService.getDrivers()
      ]);
      
      // Filter drivers to only those Available
      const availableDrivers = driversData.filter(d => d.status === 'Available');
      
      setVehicles(vehiclesData || []);
      setDrivers(availableDrivers || []);
      setSelectedVehicle(vehiclesData[0]?._id || '');
      setSelectedDriver(availableDrivers[0]?.user?._id || '');
      setAssignModalOpen(true);
    } catch (err) {
      console.error('Loading assignment options failed:', err);
    }
  };

  const handleAssignShipment = async (e) => {
    e.preventDefault();
    if (!selectedVehicle || !selectedDriver || !selectedShipment) return;

    try {
      await shipmentService.assignShipment(selectedShipment._id, {
        vehicleId: selectedVehicle,
        driverId: selectedDriver
      });
      setAssignModalOpen(false);
      fetchShipments();
    } catch (err) {
      console.error('Assignment failed:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedShipment) return;

    try {
      const updatedComments = await shipmentService.addComment(selectedShipment._id, commentText);
      setSelectedShipment(prev => ({ ...prev, comments: updatedComments }));
      setCommentText('');
    } catch (err) {
      console.error('Adding comment failed:', err);
    }
  };

  const handleDeleteShipment = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this shipment record?')) return;
    try {
      await shipmentService.deleteShipment(id);
      setSelectedShipment(null);
      fetchShipments();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed. Check status.');
    }
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      
      {/* LEFT BOARD: SEARCH, FILTERS & SHIPMENT GRID LIST */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 overflow-hidden">
        
        {/* Controls Header */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search shipment ID, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100"
            />
          </form>

          <div className="flex gap-3 w-full md:w-auto">
            {/* Status Select */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-350"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="In Transit">In Transit</option>
              <option value="Delayed">Delayed</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Priority Select */}
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-350"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            {/* Create Button */}
            {canCreate && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="ml-auto px-4 py-2 bg-brand-650 hover:bg-brand-550 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" /> Add Shipment
              </button>
            )}
          </div>
        </div>

        {/* shipments list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <TableSkeleton rows={6} />
          ) : shipments.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-sm">
              No shipments found matching filters.
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850/40 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold h-10">
                    <th className="pl-6">ID</th>
                    <th>Route Journey</th>
                    <th>Driver / Vehicle</th>
                    <th>Scheduled Date</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {shipments.map((ship) => (
                    <tr
                      key={ship._id}
                      onClick={() => handleSelectShipment(ship)}
                      className={`cursor-pointer transition-colors hover:bg-slate-50/55 dark:hover:bg-slate-800/20 h-16 ${
                        selectedShipment?._id === ship._id ? 'bg-brand-50/20 dark:bg-brand-950/15' : ''
                      }`}
                    >
                      <td className="pl-6 font-bold text-slate-800 dark:text-slate-200">
                        {ship.shipmentId}
                      </td>
                      <td>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {ship.origin.name} → {ship.destination.name}
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {ship.destination.address}
                        </div>
                      </td>
                      <td>
                        {ship.driver ? (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{ship.driver.name}</div>
                            <div className="text-[10px] text-slate-400">{ship.vehicle?.vehicleNumber || 'No Truck'}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="text-slate-600 dark:text-slate-400">
                        {new Date(ship.scheduledDeliveryDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                          ship.priority === 'Critical'
                            ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400'
                            : ship.priority === 'High'
                            ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400'
                            : ship.priority === 'Medium'
                            ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-400'
                            : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                        }`}>
                          {ship.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                          ship.status === 'Delivered'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/25 dark:border-emerald-900/50 dark:text-emerald-400'
                            : ship.status === 'In Transit'
                            ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-400'
                            : ship.status === 'Delayed'
                            ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400'
                            : ship.status === 'Cancelled'
                            ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400'
                            : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                        }`}>
                          {ship.status}
                        </span>
                      </td>
                      <td className="pr-6">
                        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-700" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* RIGHT BOARD: COLLAPSIBLE DETAILS AND TIMELINE PANEL */}
      {selectedShipment && (
        <div className="w-96 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden animate-slide-in">
          
          {/* Header Panel */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850/20">
            <div>
              <h3 className="font-bold text-slate-850 dark:text-slate-200">{selectedShipment.shipmentId}</h3>
              <p className="text-[10px] text-slate-400">Created: {new Date(selectedShipment.createdAt).toLocaleString()}</p>
            </div>
            <button
              onClick={() => setSelectedShipment(null)}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* 1. Trip Stats details */}
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold text-slate-450 uppercase">Origin Address</span>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{selectedShipment.origin.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{selectedShipment.origin.address}</div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-450 uppercase">Destination Address</span>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{selectedShipment.destination.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{selectedShipment.destination.address}</div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-450 uppercase">Cargo Weight</span>
                  <div className="text-xs text-slate-700 dark:text-slate-350">{selectedShipment.dimensions?.weight} kg</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-450 uppercase">Cargo Volume</span>
                  <div className="text-xs text-slate-700 dark:text-slate-350">{selectedShipment.dimensions?.volume} m³</div>
                </div>
              </div>
            </div>

            {/* 2. Dispatch Assignment Actions Panel */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850/40 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
              <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 mb-3">Asset Allocation</h4>
              {selectedShipment.driver ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-450">Assigned Driver:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{selectedShipment.driver.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-450">Assigned Truck:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedShipment.vehicle?.vehicleNumber}</span>
                  </div>
                  {canDispatch && ['Pending', 'Assigned'].includes(selectedShipment.status) && (
                    <button
                      onClick={() => openAssignModal(selectedShipment)}
                      className="w-full mt-2 py-1.5 border border-brand-500 hover:bg-brand-500 hover:text-white text-brand-500 rounded font-semibold text-[11px] transition-colors"
                    >
                      Re-assign Assets
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-[11px] text-slate-500">No driver or vehicle allocated for dispatch.</p>
                  {canDispatch && (
                    <button
                      onClick={() => openAssignModal(selectedShipment)}
                      className="w-full mt-3 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Allocate Vehicle & Driver
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Proof of Delivery Image Display */}
            {selectedShipment.proofOfDelivery?.imageUrl && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-2 flex items-center gap-1">
                  <FileCheck className="h-4 w-4" /> Proof of Delivery Uploaded
                </h4>
                <div className="aspect-video w-full rounded border border-emerald-300 dark:border-emerald-900 bg-black/10 overflow-hidden relative">
                  <img
                    src={`${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}${selectedShipment.proofOfDelivery.imageUrl}`}
                    alt="Proof of Delivery"
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&h=250&q=80';
                    }}
                  />
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-450 mt-2 flex flex-col gap-0.5">
                  <div><strong>Signed By:</strong> {selectedShipment.proofOfDelivery.signedBy}</div>
                  <div><strong>Date:</strong> {new Date(selectedShipment.proofOfDelivery.timestamp).toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* 3. Trip Status History Timeline logs */}
            <div>
              <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 mb-3">Status Timeline</h4>
              <div className="space-y-3">
                {selectedShipment.statusHistory?.map((history, idx) => (
                  <div key={idx} className="flex gap-3 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                      {idx !== selectedShipment.statusHistory.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 dark:bg-slate-800/80"></div>}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-350">
                        <span>{history.status}</span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(history.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{history.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Shipment comment discussion thread */}
            <div>
              <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 mb-3">Discussion Board</h4>
              <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto pr-1">
                {selectedShipment.comments?.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-3 text-center">No comments posted yet.</p>
                ) : (
                  selectedShipment.comments?.map((c, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start">
                      <img src={c.user?.avatar} alt="avatar" className="h-6 w-6 rounded-full object-cover border border-slate-200 dark:border-slate-800" />
                      <div className="flex-1 bg-slate-50 dark:bg-slate-850/50 p-2 rounded-lg text-[11px]">
                        <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                          <span>{c.user?.name}</span>
                          <span className="text-[8px] text-slate-400 font-normal">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-450 mt-0.5 leading-relaxed">{c.comment}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask for ETA or comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors"
                >
                  <Send className="h-3 w-3" />
                </button>
              </form>
            </div>

            {/* 5. Delete Action Card */}
            {canDispatch && (
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 pb-2">
                <button
                  onClick={() => handleDeleteShipment(selectedShipment._id)}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-200 dark:bg-rose-950/10 dark:border-rose-900/40 text-rose-500 rounded font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" /> Delete Shipment Record
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* CREATE SHIPMENT MODAL FORM */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-lg p-6 relative animate-scale-in">
            <h3 className="text-lg font-bold text-slate-850 dark:text-white mb-4">Create New Delivery Shipment</h3>
            
            <form onSubmit={handleCreateShipment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Origin City Preset</label>
                  <select
                    value={originKey}
                    onChange={(e) => setOriginKey(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                  >
                    {Object.keys(cityPresets).map(k => (
                      <option key={k} value={k}>{cityPresets[k].name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Destination City Preset</label>
                  <select
                    value={destKey}
                    onChange={(e) => setDestKey(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                  >
                    {Object.keys(cityPresets).map(k => (
                      <option key={k} value={k}>{cityPresets[k].name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Scheduled Delivery Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Trip Priority Level</label>
                  <select
                    value={shipPriority}
                    onChange={(e) => setShipPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Critical">Critical Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Load Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Load Volume (m³)</label>
                  <input
                    type="number"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold"
                >
                  Save Shipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH ASSIGNMENT MODAL FORM */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-md p-6 relative animate-scale-in">
            <h3 className="text-lg font-bold text-slate-850 dark:text-white mb-4">Allocate Delivery Route Assets</h3>
            
            <form onSubmit={handleAssignShipment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Select Available Vehicle</label>
                {vehicles.length === 0 ? (
                  <div className="text-xs text-rose-500 p-2 border border-rose-200 rounded-lg bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/40">
                    No available vehicles in system! Put a truck in "Satisfactory" state.
                  </div>
                ) : (
                  <select
                    value={selectedVehicle}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                  >
                    {vehicles.map(v => (
                      <option key={v._id} value={v._id}>
                        {v.vehicleNumber} - {v.type} (Cap: {v.capacity}kg, Fuel: {v.fuelStatus}%)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Select Available Driver</label>
                {drivers.length === 0 ? (
                  <div className="text-xs text-rose-500 p-2 border border-rose-200 rounded-lg bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/40">
                    No available drivers logged on! Put a driver in "Available" state.
                  </div>
                ) : (
                  <select
                    value={selectedDriver}
                    onChange={(e) => setSelectedDriver(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                  >
                    {drivers.map(d => (
                      <option key={d.user._id} value={d.user._id}>
                        {d.user.name} (Exp: {d.experience}y, Lic: {d.licenseNumber})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={vehicles.length === 0 || drivers.length === 0}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Shipments;
