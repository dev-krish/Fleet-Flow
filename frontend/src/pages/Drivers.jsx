import React, { useState, useEffect } from 'react';
import driverService from '../services/driverService';
import { CardSkeleton } from '../components/Skeletons';
import { useAuth } from '../hooks/useAuth';
import {
  Users,
  Award,
  CreditCard,
  Phone,
  Truck,
  CheckCircle,
  Clock,
  PowerOff
} from 'lucide-react';

const Drivers = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'Admin' || user?.role === 'Dispatcher';

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const data = await driverService.getDrivers();
      setDrivers(data || []);
    } catch (err) {
      console.error('Error listing drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await driverService.updateDriverStatus(id, { status });
      fetchDrivers();
    } catch (err) {
      console.error('Updating status failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100">Driver Resource Directory</h3>
        <p className="text-xs text-slate-400">Monitor active drivers, duty status, experience, and license records.</p>
      </div>

      {/* Drivers grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : drivers.length === 0 ? (
        <div className="text-center py-20 text-slate-450 text-sm">
          No drivers registered in the database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((drv) => (
            <div
              key={drv._id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative"
            >
              {/* Profile Card Header */}
              <div className="flex gap-4 items-center">
                <img
                  src={drv.user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
                  alt={drv.user?.name}
                  className="h-12 w-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-850 dark:text-white truncate">{drv.user?.name}</h4>
                  <span className="text-[10px] text-slate-400 font-medium truncate block">{drv.user?.email}</span>
                </div>

                {/* Status Indicator */}
                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border inline-flex items-center gap-1 shrink-0 ${
                  drv.status === 'Available'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-450'
                    : drv.status === 'On Duty'
                    ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-450'
                    : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                }`}>
                  {drv.status === 'Available' ? (
                    <><CheckCircle className="h-2.5 w-2.5" /> Available</>
                  ) : drv.status === 'On Duty' ? (
                    <><Clock className="h-2.5 w-2.5" /> On Duty</>
                  ) : (
                    <><PowerOff className="h-2.5 w-2.5" /> Offline</>
                  )}
                </span>
              </div>

              {/* Driver Stats */}
              <div className="grid grid-cols-2 gap-4 border-y border-slate-100 dark:border-slate-800/80 py-3 text-xs">
                <div className="flex gap-2 items-center">
                  <Award className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-450 block uppercase">Experience</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-350">{drv.experience} Years</span>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
                  <div>
                    <span className="text-[9px] text-slate-450 block uppercase">License</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-350 truncate block max-w-[90px]" title={drv.licenseNumber}>
                      {drv.licenseNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Phone & Vehicle info */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-semibold text-slate-750 dark:text-slate-300">{drv.user?.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Truck Assigned:</span>
                  <span className="font-semibold text-slate-750 dark:text-slate-300">
                    {drv.assignedVehicle ? drv.assignedVehicle.vehicleNumber : <span className="text-slate-400 italic font-normal">None</span>}
                  </span>
                </div>
              </div>

              {/* Status Update Selector */}
              {canManage && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-450 uppercase">Update Shift Status</span>
                  <select
                    value={drv.status}
                    onChange={(e) => handleUpdateStatus(drv._id, e.target.value)}
                    className="px-2 py-1 text-[10px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 focus:outline-none"
                    disabled={drv.status === 'On Duty'} // Prevent unsetting status while driver is on active shipment
                  >
                    <option value="Available">Available</option>
                    <option value="Offline">Offline</option>
                    <option value="On Duty" disabled>On Duty</option>
                  </select>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default Drivers;
