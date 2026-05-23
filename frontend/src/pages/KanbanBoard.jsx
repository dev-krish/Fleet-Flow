import React, { useState, useEffect } from 'react';
import shipmentService from '../services/shipmentService';
import { KanbanSkeleton } from '../components/Skeletons';
import { useAuth } from '../hooks/useAuth';
import {
  Calendar,
  AlertCircle,
  Truck,
  ArrowRight,
  RefreshCw,
  MoreVertical,
  Trello
} from 'lucide-react';

const KanbanBoard = () => {
  const { user } = useAuth();
  const canDispatch = user?.role === 'Admin' || user?.role === 'Dispatcher';

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);

  const columns = [
    { id: 'Pending', name: 'Pending Dispatch', desc: 'Awaiting truck/driver allocation', color: 'border-t-slate-450 bg-slate-500/5' },
    { id: 'Assigned', name: 'Scheduled / Assigned', desc: 'Assets allocated, ready to depart', color: 'border-t-blue-500 bg-blue-500/5' },
    { id: 'In Transit', name: 'In Transit', desc: 'Actively moving cargo, GPS live', color: 'border-t-amber-500 bg-amber-500/5' },
    { id: 'Delivered', name: 'Delivered', desc: 'Successfully received with POD', color: 'border-t-emerald-500 bg-emerald-500/5' }
  ];

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const data = await shipmentService.getShipments();
      setShipments(data.shipments || []);
    } catch (err) {
      console.error('Error fetching shipments for Kanban Board:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const handleStatusChange = async (shipmentId, newStatus) => {
    try {
      await shipmentService.updateShipmentStatus(shipmentId, {
        status: newStatus,
        reason: `Moved via Kanban Workflow Board by ${user?.name}`
      });
      fetchShipments();
    } catch (err) {
      console.error('Failed to transition status:', err);
      alert(err.response?.data?.message || 'Unauthorized status transition');
    }
  };

  // Drag and Drop support
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const shipmentId = e.dataTransfer.getData('text/plain');
    const shipment = shipments.find(s => s._id === shipmentId);
    
    if (!shipment) return;
    if (shipment.status === targetStatus) return;

    // Driver rule validation
    if (user?.role === 'Driver') {
      if (shipment.driver?._id !== user.id) return;
      if (!['In Transit', 'Delayed', 'Delivered'].includes(targetStatus)) return;
    }

    // Delivery POD restriction check: If status transition is to Delivered, require image upload via DriverPortal instead of Kanban drop
    if (targetStatus === 'Delivered') {
      alert('Delivering shipments requires uploading a Proof of Delivery image. Please use the Driver portal or Shipment details actions.');
      return;
    }

    // Cannot move unassigned to Transit
    if (targetStatus === 'In Transit' && !shipment.driver) {
      alert('Cannot transition shipment to "In Transit" without allocating a vehicle and driver first.');
      return;
    }

    await handleStatusChange(shipmentId, targetStatus);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-4">
      {/* Board Controls */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Trello className="h-5 w-5 text-brand-650" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100">Interactive Dispatch Pipeline</h3>
        </div>
        <button
          onClick={fetchShipments}
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850/60 transition-colors"
          title="Refresh board"
        >
          <RefreshCw className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        </button>
      </div>

      {/* Kanban Grid */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        {loading ? (
          <KanbanSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-w-[1000px] h-full">
            {columns.map((col) => {
              const colShipments = shipments.filter((s) => s.status === col.id || (col.id === 'In Transit' && s.status === 'Delayed'));
              return (
                <div
                  key={col.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className="flex flex-col bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 rounded-xl h-full overflow-hidden"
                >
                  {/* Column Header */}
                  <div className={`border-t-4 ${col.color.split(' ')[0]} pt-2 pb-3 mb-2 flex justify-between items-center`}>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">{col.name}</h4>
                      <span className="text-[10px] text-slate-450 mt-0.5 line-clamp-1">{col.desc}</span>
                    </div>
                    <span className="h-5 w-5 bg-slate-200 dark:bg-slate-800 rounded-full text-[10px] font-bold flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                      {colShipments.length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {colShipments.length === 0 ? (
                      <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-[10px] text-slate-400 select-none">
                        Drop shipments here
                      </div>
                    ) : (
                      colShipments.map((ship) => (
                        <div
                          key={ship._id}
                          draggable={canDispatch || (user?.role === 'Driver' && ship.driver?._id === user.id)}
                          onDragStart={(e) => handleDragStart(e, ship._id)}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-lg shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all select-none space-y-3 group"
                        >
                          {/* Card ID & Priority */}
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-slate-850 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                              {ship.shipmentId}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] border ${
                              ship.priority === 'Critical'
                                ? 'bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400'
                                : ship.priority === 'High'
                                ? 'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400'
                                : ship.priority === 'Medium'
                                ? 'bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400'
                                : 'bg-slate-50 border-slate-100 text-slate-650 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                            }`}>
                              {ship.priority}
                            </span>
                          </div>

                          {/* Origin & Destination Journey */}
                          <div>
                            <div className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                              {ship.origin.name} → {ship.destination.name}
                            </div>
                            <div className="text-[10px] text-slate-450 truncate mt-0.5">{ship.destination.address}</div>
                          </div>

                          {/* Driver & Date Footer */}
                          <div className="flex justify-between items-center border-t border-slate-50 dark:border-slate-800/80 pt-3">
                            <div className="flex items-center gap-1.5">
                              {ship.driver ? (
                                <img
                                  src={ship.driver.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
                                  alt="Driver"
                                  className="h-5 w-5 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                  title={ship.driver.name}
                                />
                              ) : (
                                <div className="h-5 w-5 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-[8px] text-slate-400 italic font-medium" title="Unassigned">
                                  UA
                                </div>
                              )}
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[80px]">
                                {ship.driver ? ship.driver.name : 'Unassigned'}
                              </span>
                            </div>

                            <span className="text-[9px] text-slate-400 flex items-center gap-1">
                              <Calendar className="h-3 w-3 shrink-0" />
                              {new Date(ship.scheduledDeliveryDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          {/* Dropdown status transit fallback selector */}
                          {(canDispatch || (user?.role === 'Driver' && ship.driver?._id === user.id)) && (
                            <div className="pt-1.5 flex justify-end">
                              <select
                                value={ship.status}
                                onChange={(e) => handleStatusChange(ship._id, e.target.value)}
                                className="px-2 py-0.5 text-[9px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-slate-500 dark:text-slate-400 focus:outline-none"
                              >
                                <option disabled value="">Move to...</option>
                                <option value="Pending">Pending</option>
                                <option value="Assigned">Assigned</option>
                                <option value="In Transit">In Transit</option>
                                <option disabled value="Delivered">Delivered (needs POD)</option>
                              </select>
                            </div>
                          )}

                        </div>
                      ))
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default KanbanBoard;
