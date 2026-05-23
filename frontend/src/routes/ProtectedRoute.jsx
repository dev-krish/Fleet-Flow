import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-t-brand-500 border-slate-700 rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-400">Loading FleetFlow Secure Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login if user session is not found
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If user's role is not authorized, redirect to their home portal
    const fallbackPath = user.role === 'Driver' ? '/driver-portal' : '/';
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
