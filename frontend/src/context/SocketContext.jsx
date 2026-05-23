import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';

export const SocketContext = createContext();

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Toast dispatch helper
  const addToast = (toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...toast, id }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    
    // Initialize socket connection with token
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Connected to FleetFlow WebSocket server');
    });

    newSocket.on('notification:new', (notification) => {
      console.log('Received notification:', notification);
      
      // Append to local notifications list
      setNotifications((prev) => [notification, ...prev]);

      // Trigger stylish toast alert
      addToast({
        title: notification.title,
        message: notification.message,
        type: notification.type, // e.g. SHIPMENT_ASSIGNED, etc.
      });
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <SocketContext.Provider value={{ socket, notifications, setNotifications, toasts, addToast, removeToast }}>
      {children}
      
      {/* Global Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-md transition-all duration-300 animate-slide-in ${
              toast.type === 'SHIPMENT_ASSIGNED'
                ? 'bg-blue-500/90 text-white border-blue-400'
                : toast.type === 'SHIPMENT_DELIVERED'
                ? 'bg-emerald-600/90 text-white border-emerald-500'
                : toast.type === 'SHIPMENT_DELAYED'
                ? 'bg-amber-500/90 text-slate-900 border-amber-400'
                : toast.type === 'MAINTENANCE_DUE'
                ? 'bg-rose-500/90 text-white border-rose-400'
                : 'bg-slate-800/90 text-white border-slate-700'
            }`}
          >
            <div className="flex-1">
              <div className="font-bold text-sm">{toast.title}</div>
              <div className="text-xs mt-1 opacity-90">{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white hover:opacity-75 font-semibold text-sm leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </SocketContext.Provider>
  );
};
