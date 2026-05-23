import React, { useState, useEffect } from 'react';
import analyticsService from '../services/analyticsService';
import { CardSkeleton } from '../components/Skeletons';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Wrench,
  TrendingUp,
  Compass,
  ArrowRight,
  Truck
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const Dashboard = () => {
  const [kpis, setKpis] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load metrics from analytics service
  const loadData = async () => {
    try {
      const [kpiRes, chartRes] = await Promise.all([
        analyticsService.getKPIs(),
        analyticsService.getChartData(),
      ]);
      setKpis(kpiRes);
      setChartData(chartRes);
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recharts color palettes
  const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#64748b'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[350px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse"></div>
          <div className="h-[350px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Format Recharts data structures
  const statusChartData = chartData?.statusSplit?.map(s => ({
    name: s._id,
    value: s.count
  })) || [];

  const priorityChartData = chartData?.prioritySplit?.map(p => ({
    name: p._id,
    value: p.count
  })) || [];

  const vehicleChartData = chartData?.vehicleSplit?.map(v => ({
    name: v._id,
    Available: v.available,
    Assigned: v.total - v.available
  })) || [];

  const timelineData = chartData?.deliveriesOverTime?.map(d => ({
    date: d._id.substring(5), // extract MM-DD
    deliveries: d.deliveries
  })) || [];

  return (
    <div className="space-y-6">
      
      {/* 1. KPI HIGHLIGHT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Shipments */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Shipments
            </span>
            <h3 className="text-3xl font-extrabold text-slate-850 dark:text-white mt-1">
              {kpis?.shipments?.total || 0}
            </h3>
            <span className="text-xs text-slate-400 flex items-center gap-1 mt-2">
              <Clock className="h-3 w-3" /> {kpis?.shipments?.pending || 0} pending assignments
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
        </div>

        {/* Deliveries Success Rate */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Success Rate
            </span>
            <h3 className="text-3xl font-extrabold text-slate-850 dark:text-white mt-1">
              {kpis?.shipments?.successRate || 0}%
            </h3>
            <span className="text-xs text-emerald-500 flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3" /> {kpis?.shipments?.delivered || 0} total delivered
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Delayed Shipments */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Delayed Cargo
            </span>
            <h3 className="text-3xl font-extrabold text-slate-850 mt-1 text-amber-500">
              {kpis?.shipments?.delayed || 0}
            </h3>
            <span className="text-xs text-slate-400 flex items-center gap-1 mt-2">
              In transit: {kpis?.shipments?.inTransit || 0} vehicles
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertOctagon className="h-6 w-6" />
          </div>
        </div>

        {/* Fleet Maintenance */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Fleet in Service
            </span>
            <h3 className="text-3xl font-extrabold text-slate-850 dark:text-white mt-1">
              {kpis?.vehicles?.total - kpis?.vehicles?.inMaintenance || 0}
            </h3>
            <span className="text-xs text-rose-500 flex items-center gap-1 mt-2">
              <Wrench className="h-3 w-3" /> {kpis?.vehicles?.inMaintenance || 0} vehicles in repair
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Truck className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* 2. ANALYTICS CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Deliveries Chronology (Left) */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200 mb-6 uppercase tracking-wider">
            Completed Deliveries Trend (Last 7 Days)
          </h4>
          <div className="h-[280px]">
            {timelineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No delivery milestones recorded in this duration.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0e8fe7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0e8fe7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="deliveries" stroke="#0e8fe7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDeliveries)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Shipment Status Distribution (Right) */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200 mb-6 uppercase tracking-wider">
            Shipment Status Split
          </h4>
          <div className="h-[280px] flex flex-col items-center justify-center">
            {statusChartData.length === 0 ? (
              <div className="text-xs text-slate-400">No shipments found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* 3. LOWER BOARD: VEHICLE TYPES + AUDIT LOGS TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Vehicle Utilization (Left) */}
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200 mb-6 uppercase tracking-wider">
            Vehicle Class Deployment
          </h4>
          <div className="h-[280px]">
            {vehicleChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No vehicles listed.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleChartData} stackOffset="sign">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="Available" stackId="a" fill="#10b981" barSize={18} />
                  <Bar dataKey="Assigned" stackId="a" fill="#3b82f6" barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Audit Logs Timeline Feed (Center & Right) */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200 uppercase tracking-wider">
              Operations Audit Timeline
            </h4>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
          </div>

          <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2">
            {chartData?.activities?.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No warehouse events logged yet.
              </div>
            ) : (
              chartData?.activities?.map((activity) => (
                <div key={activity._id} className="flex gap-4 items-start relative pb-4 border-l-2 border-slate-200 dark:border-slate-800 pl-4 last:border-0 last:pb-0">
                  <div className="absolute top-1.5 left-[-6px] h-2.5 w-2.5 rounded-full bg-brand-500"></div>
                  
                  <img
                    src={activity.user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
                    alt="avatar"
                    className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 mt-0.5"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {activity.user?.name || 'System'}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(activity.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300 mr-1.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                        {activity.action}
                      </span>
                      {activity.details}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
