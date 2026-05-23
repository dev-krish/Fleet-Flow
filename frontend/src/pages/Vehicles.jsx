import React, { useState, useEffect } from 'react';
import vehicleService from '../services/vehicleService';
import { CardSkeleton } from '../components/Skeletons';
import { useAuth } from '../hooks/useAuth';
import {
  Truck,
  Plus,
  Wrench,
  Gauge,
  User,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';

const Vehicles = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'Admin' || user?.role === 'Dispatcher';
  const isAdmin = user?.role === 'Admin';

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form states - Create
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [type, setType] = useState('Semi-Truck');
  const [capacity, setCapacity] = useState(18000);
  const [fuelStatus, setFuelStatus] = useState(100);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await vehicleService.getVehicles();
      setVehicles(data || []);
    } catch (err) {
      console.error('Error listing vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    if (!vehicleNumber) return;

    try {
      await vehicleService.createVehicle({
        vehicleNumber,
        type,
        capacity: Number(capacity),
        fuelStatus: Number(fuelStatus),
      });
      setCreateModalOpen(false);
      setVehicleNumber('');
      fetchVehicles();
    } catch (err) {
      console.error('Creating vehicle failed:', err);
      alert(err.response?.data?.message || 'Unique vehicle number validation failed.');
    }
  };

  const handleUpdateMaintenance = async (id, status) => {
    try {
      await vehicleService.updateVehicle(id, { maintenanceStatus: status });
      fetchVehicles();
    } catch (err) {
      console.error('Failed to update maintenance status:', err);
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vehicle asset?')) return;

    try {
      await vehicleService.deleteVehicle(id);
      fetchVehicles();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed. Check utilization.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Transport Fleet Registry</h3>
          <p className="text-xs text-slate-400">Track and manage vehicle classes, capacities, and maintenance checks.</p>
        </div>

        {canManage && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 bg-brand-650 hover:bg-brand-550 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Vehicle
          </button>
        )}
      </div>

      {/* Vehicles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-20 text-slate-450 text-sm">
          No vehicles registered in the fleet yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((veh) => (
            <div
              key={veh._id}
              className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative ${
                veh.maintenanceStatus === 'Under Repair'
                  ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/5'
                  : veh.maintenanceStatus === 'Service Due'
                  ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/5'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Truck Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${
                    veh.maintenanceStatus === 'Under Repair'
                      ? 'bg-rose-500/10 text-rose-500'
                      : veh.maintenanceStatus === 'Service Due'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-brand-500/10 text-brand-500'
                  }`}>
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-850 dark:text-white">{veh.vehicleNumber}</h4>
                    <span className="text-[10px] text-slate-400">{veh.type}</span>
                  </div>
                </div>

                {isAdmin && veh.availability && (
                  <button
                    onClick={() => handleDeleteVehicle(veh._id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Remove Vehicle"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* utilization meters */}
              <div className="grid grid-cols-2 gap-4 border-y border-slate-100 dark:border-slate-800/80 py-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-450 block uppercase">Max Capacity</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{veh.capacity.toLocaleString()} kg</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-450 block uppercase">Assignment Status</span>
                  <span className={`inline-flex items-center gap-1 font-bold text-[10px] ${
                    veh.availability ? 'text-emerald-500' : 'text-blue-500'
                  }`}>
                    {veh.availability ? (
                      <><CheckCircle className="h-3 w-3" /> Available</>
                    ) : (
                      <><Gauge className="h-3 w-3" /> In Use</>
                    )}
                  </span>
                </div>
              </div>

              {/* Fuel Indicator Bar */}
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-slate-450">Fuel Status</span>
                  <span className="font-bold text-slate-700 dark:text-slate-350">{Math.round(veh.fuelStatus)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      veh.fuelStatus < 25
                        ? 'bg-rose-500 animate-pulse'
                        : veh.fuelStatus < 50
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${veh.fuelStatus}%` }}
                  ></div>
                </div>
              </div>

              {/* Drivers link info */}
              <div className="flex items-center gap-2 text-xs">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Assigned Driver:</span>
                <span className="font-semibold text-slate-750 dark:text-slate-300">
                  {veh.assignedDriver ? veh.assignedDriver.name : <span className="text-slate-400 italic font-normal">Unassigned</span>}
                </span>
              </div>

              {/* Maintenance toggler */}
              {canManage && (
                <div className="pt-2 border-t border-slate-150 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-450 uppercase flex items-center gap-1">
                    <Wrench className="h-3.5 w-3.5" /> Maintenance state
                  </span>
                  <select
                    value={veh.maintenanceStatus}
                    onChange={(e) => handleUpdateMaintenance(veh._id, e.target.value)}
                    className="px-2 py-1 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option value="Satisfactory">Satisfactory</option>
                    <option value="Service Due">Service Due</option>
                    <option value="Under Repair">Under Repair</option>
                  </select>
                </div>
              )}

              {/* Warning notifications */}
              {veh.maintenanceStatus !== 'Satisfactory' && (
                <div className={`p-2 rounded text-[10px] flex gap-1.5 items-start mt-2 border ${
                  veh.maintenanceStatus === 'Under Repair'
                    ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400'
                    : 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400'
                }`}>
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {veh.maintenanceStatus === 'Under Repair'
                      ? 'Out of order. Unassigned from active drivers.'
                      : 'Truck has service alerts flagged. Schedule inspections.'}
                  </span>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* CREATE VEHICLE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-sm p-6 relative animate-scale-in">
            <h3 className="text-lg font-bold text-slate-850 dark:text-white mb-4 font-sans">Register Vehicle Asset</h3>
            
            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Vehicle License Number</label>
                <input
                  type="text"
                  placeholder="e.g. V-FL-9912"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Vehicle Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-white"
                >
                  <option value="Semi-Truck">Semi-Truck</option>
                  <option value="Box Truck">Box Truck</option>
                  <option value="Cargo Van">Cargo Van</option>
                  <option value="Flatbed">Flatbed</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Max Weight Capacity (kg)</label>
                <input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Initial Fuel Level (%)</label>
                <input
                  type="number"
                  max="100"
                  min="0"
                  value={fuelStatus}
                  onChange={(e) => setFuelStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-white"
                />
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
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Vehicles;
