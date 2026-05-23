import React, { useState, useEffect } from 'react';
import driverService from '../services/driverService';
import shipmentService from '../services/shipmentService';
import { useAuth } from '../hooks/useAuth';
import {
  Compass,
  Truck,
  User,
  Clock,
  Navigation,
  FileCheck,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  Send,
  X,
  CheckCircle
} from 'lucide-react';

const DriverPortal = () => {
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states - POD Upload
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  
  const [signedBy, setSignedBy] = useState('');
  const [podFile, setPodFile] = useState(null);
  const [delayReason, setDelayReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Comment timeline state
  const [commentText, setCommentText] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await driverService.getDriverTasks();
      setTasks(data || []);
      
      // If we already have a selected task, refresh its details (specifically comments/timeline)
      if (activeTask) {
        const freshDetail = await shipmentService.getShipmentById(activeTask._id);
        setActiveTask(freshDetail);
      } else if (data && data.length > 0) {
        // Default to first active task
        const firstTask = await shipmentService.getShipmentById(data[0]._id);
        setActiveTask(firstTask);
      }
    } catch (err) {
      console.error('Error fetching driver tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStartTrip = async () => {
    if (!activeTask) return;
    try {
      await shipmentService.updateShipmentStatus(activeTask._id, {
        status: 'In Transit',
        reason: 'Driver started the trip. Departed pickup depot.'
      });
      fetchTasks();
    } catch (err) {
      console.error('Failed to start trip:', err);
    }
  };

  const handleReportDelay = async (e) => {
    e.preventDefault();
    if (!activeTask || !delayReason.trim()) return;

    try {
      await shipmentService.updateShipmentStatus(activeTask._id, {
        status: 'Delayed',
        reason: `Delay reported: ${delayReason}`
      });
      setDelayModalOpen(false);
      setDelayReason('');
      fetchTasks();
    } catch (err) {
      console.error('Failed to record delay:', err);
    }
  };

  const handleDeliverShipment = async (e) => {
    e.preventDefault();
    if (!activeTask || !podFile) return;

    setIsSubmitting(true);
    try {
      await shipmentService.deliverShipment(activeTask._id, podFile, signedBy || 'Supervisor Receiver');
      setDeliverModalOpen(false);
      setPodFile(null);
      setSignedBy('');
      setActiveTask(null);
      fetchTasks();
    } catch (err) {
      console.error('POD delivery failed:', err);
      alert(err.response?.data?.message || 'Failed to submit proof of delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activeTask) return;

    try {
      const updatedComments = await shipmentService.addComment(activeTask._id, commentText);
      setActiveTask(prev => ({ ...prev, comments: updatedComments }));
      setCommentText('');
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center text-slate-400 text-xs">
        Loading Driver Portal tasks...
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
      
      {/* LEFT BOARD: ACTIVE TASKS LIST */}
      <div className="w-full lg:w-80 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shrink-0 overflow-y-auto">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-1.5 border-b pb-2">
          <Truck className="h-4 w-4" /> Active Delivery Tasks
        </h3>

        {tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-400">
            <CheckCircle className="h-8 w-8 text-emerald-500 mb-2 animate-bounce" />
            <span className="text-xs font-semibold">No assigned deliveries!</span>
            <span className="text-[10px] mt-0.5 text-slate-500">Awaiting dispatcher allocations.</span>
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {tasks.map((task) => (
              <div
                key={task._id}
                onClick={async () => {
                  const detail = await shipmentService.getShipmentById(task._id);
                  setActiveTask(detail);
                }}
                className={`p-4 border rounded-xl cursor-pointer hover:shadow-sm transition-all text-xs ${
                  activeTask?._id === task._id
                    ? 'border-brand-500 bg-brand-50/10 dark:bg-brand-950/10'
                    : 'border-slate-250 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-800 dark:text-white">{task.shipmentId}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                    task.status === 'In Transit'
                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400'
                      : task.status === 'Delayed'
                      ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                  }`}>
                    {task.status}
                  </span>
                </div>
                <div className="font-semibold text-slate-700 dark:text-slate-350">{task.origin.name} → {task.destination.name}</div>
                <p className="text-[10px] text-slate-450 mt-1 line-clamp-1">Deliver by: {new Date(task.scheduledDeliveryDate).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT BOARD: TASK WORKSPACE DETAILS */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex flex-col overflow-hidden">
        {activeTask ? (
          <div className="flex-1 flex flex-col min-h-0 space-y-6">
            
            {/* Workspace Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-850 dark:text-white flex items-center gap-2">
                  <span>Shipment {activeTask.shipmentId}</span>
                  <span className="text-xs px-2.5 py-0.5 font-bold rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-200 dark:border-brand-900">
                    {activeTask.status}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Journey: <strong>{activeTask.origin.name} ({activeTask.origin.address})</strong> to <strong>{activeTask.destination.name} ({activeTask.destination.address})</strong>
                </p>
              </div>

              {/* Status Controls */}
              <div className="flex gap-2 w-full md:w-auto">
                {activeTask.status === 'Assigned' && (
                  <button
                    onClick={handleStartTrip}
                    className="w-full md:w-auto px-4 py-2 bg-brand-600 hover:bg-brand-550 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="h-4 w-4" /> Start Delivery Trip
                  </button>
                )}

                {(activeTask.status === 'In Transit' || activeTask.status === 'Delayed') && (
                  <>
                    <button
                      onClick={() => setDelayModalOpen(true)}
                      className="px-3 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-500" /> Delay Alert
                    </button>
                    <button
                      onClick={() => setDeliverModalOpen(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-550 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-500/10"
                    >
                      <FileCheck className="h-4 w-4" /> Unload & Deliver (POD)
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Split Board Layout: Left details, Right Discussion */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 overflow-hidden">
              
              {/* Detailed parameters */}
              <div className="space-y-6 overflow-y-auto pr-2">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider">Cargo Parameters</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-450 block uppercase">Weight Limit</span>
                      <span className="font-semibold text-slate-750 dark:text-slate-350">{activeTask.dimensions?.weight} kg</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-850/40 border border-slate-100 dark:border-slate-800 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-450 block uppercase">Cargo Volume</span>
                      <span className="font-semibold text-slate-750 dark:text-slate-350">{activeTask.dimensions?.volume} m³</span>
                    </div>
                  </div>
                </div>

                {/* Warehouse Manager Contact Card */}
                <div className="bg-slate-50 dark:bg-slate-850/30 p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 text-xs">
                  <h4 className="font-bold text-slate-850 dark:text-slate-200 flex items-center gap-1">
                    <User className="h-4 w-4 text-slate-400" /> Dispatching Officer
                  </h4>
                  {activeTask.warehouseManager ? (
                    <div className="space-y-1">
                      <div>Name: <strong>{activeTask.warehouseManager.name}</strong></div>
                      <div>Email: <span className="text-slate-500">{activeTask.warehouseManager.email}</span></div>
                    </div>
                  ) : (
                    <span className="text-slate-400">N/A</span>
                  )}
                </div>

                {/* Status Timeline History */}
                <div>
                  <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider mb-3">Status Timeline Log</h4>
                  <div className="space-y-3">
                    {activeTask.statusHistory?.map((h, idx) => (
                      <div key={idx} className="flex gap-2.5 text-xs">
                        <div className="flex flex-col items-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-brand-500"></div>
                          {idx !== activeTask.statusHistory.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-800 mt-1"></div>}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between font-semibold text-slate-750 dark:text-slate-350">
                            <span>{h.status}</span>
                            <span className="text-[9px] text-slate-400">{new Date(h.updatedAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{h.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Discussion comments thread */}
              <div className="flex flex-col bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 overflow-hidden">
                <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" /> Discussion Feed
                </h4>

                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                  {activeTask.comments?.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No comments or messages.
                    </div>
                  ) : (
                    activeTask.comments?.map((c, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <img src={c.user?.avatar} alt="avatar" className="h-5 w-5 rounded-full object-cover border" />
                        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-[10px]">
                          <div className="flex justify-between font-bold text-slate-700 dark:text-slate-350">
                            <span>{c.user?.name}</span>
                            <span className="text-[8px] text-slate-400 font-normal">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 mt-0.5 font-medium">{c.comment}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Send updates to office..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>

            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
            <Compass className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-2 animate-spin-slow" />
            <span>Select a shipment task from the left listing to view details.</span>
          </div>
        )}
      </div>

      {/* DELIVER PROOF OF DELIVERY MODAL */}
      {deliverModalOpen && activeTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-sm p-6 relative animate-scale-in">
            <h3 className="text-sm font-bold text-slate-850 dark:text-white mb-4">Complete Shipment Delivery</h3>
            
            <form onSubmit={handleDeliverShipment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Supervisor/Signee Name</label>
                <input
                  type="text"
                  placeholder="e.g. Supervisor Marcus"
                  value={signedBy}
                  onChange={(e) => setSignedBy(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">Upload Receipt Image (Proof of Delivery)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPodFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-200"
                  required
                />
                <span className="text-[9px] text-slate-400 block mt-1">Accepts JPEG, JPG, and PNG up to 5MB.</span>
              </div>

              <div className="flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setDeliverModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-550 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? 'Uploading...' : 'Verify & Deliver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELAY REASON MODAL */}
      {delayModalOpen && activeTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-full max-w-sm p-6 relative animate-scale-in">
            <h3 className="text-sm font-bold text-slate-850 dark:text-white mb-4">Report Delay Alert</h3>
            
            <form onSubmit={handleReportDelay} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">State Reason for Delay</label>
                <textarea
                  placeholder="e.g. Heavy traffic block on Freeway I-5, or flat tire repair..."
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-850 dark:text-white h-24"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setDelayModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-xs font-bold"
                >
                  Post Delay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverPortal;
