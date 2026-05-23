import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useSocket } from '../hooks/useSocket';
import {
  LayoutDashboard,
  Truck,
  Users,
  Compass,
  Bell,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  FileSpreadsheet,
  Trello,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, setNotifications } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Define navigation options based on User Roles
  const getNavLinks = () => {
    const isDriver = user?.role === 'Driver';
    
    if (isDriver) {
      return [
        { name: 'Driver Portal', path: '/driver-portal', icon: UserCheck },
        { name: 'Live Route Tracking', path: '/tracking', icon: Compass },
      ];
    }

    return [
      { name: 'Dashboard Analytics', path: '/', icon: LayoutDashboard },
      { name: 'Shipment Directory', path: '/shipments', icon: FileSpreadsheet },
      { name: 'Kanban Workflow Board', path: '/kanban', icon: Trello },
      { name: 'Vehicle Assets', path: '/vehicles', icon: Truck },
      { name: 'Driver Registry', path: '/drivers', icon: Users },
      { name: 'Live Operations Map', path: '/tracking', icon: Compass },
    ];
  };

  const navLinks = getNavLinks();
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* 1. SIDEBAR FOR DESKTOP */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Sidebar Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-3 font-bold text-lg text-slate-900 dark:text-white group">
            <img 
              src="/fleetflow_logo.svg" 
              alt="FleetFlow Logo" 
              className="h-8 w-8 transition-transform duration-500 group-hover:rotate-[360deg]" 
            />
            <span className="bg-gradient-to-r from-slate-950 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent font-extrabold tracking-tight">
              FleetFlow
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 dark:text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'}
              alt="avatar"
              className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
            <div className="overflow-hidden">
              <div className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200">
                {user?.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.role}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        ></div>
      )}

      {/* 2. MAIN CONTAINER SHELL */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* TOP NAVBAR */}
        <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 relative z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 capitalize">
              {location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1).replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors relative"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center leading-none">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Overlay Menu */}
              {notifOpen && (
                <>
                  <div onClick={() => setNotifOpen(false)} className="fixed inset-0 z-30"></div>
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl py-2 z-40 max-h-[400px] overflow-y-auto">
                    <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Alert Center</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-slate-400">
                        No active alerts at present.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif._id}
                          className={`px-4 py-3 border-b border-slate-50 dark:border-slate-800/40 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                            !notif.read ? 'bg-blue-50/50 dark:bg-blue-950/10 font-medium' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-slate-800 dark:text-slate-200">{notif.title}</span>
                            <span className="text-[9px] text-slate-400">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                            {notif.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
