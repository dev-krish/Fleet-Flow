import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';
import AuthLayout from '../layouts/AuthLayout';

// Pages imports (created next)
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Shipments from '../pages/Shipments';
import KanbanBoard from '../pages/KanbanBoard';
import Vehicles from '../pages/Vehicles';
import Drivers from '../pages/Drivers';
import LiveTracking from '../pages/LiveTracking';
import DriverPortal from '../pages/DriverPortal';

const AppRoutes = () => {
  const staffRoles = ['Admin', 'Dispatcher', 'Warehouse Manager'];

  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />

      {/* Staff Dashboard Pages */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={staffRoles}>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shipments"
        element={
          <ProtectedRoute allowedRoles={staffRoles}>
            <DashboardLayout>
              <Shipments />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/kanban"
        element={
          <ProtectedRoute allowedRoles={staffRoles}>
            <DashboardLayout>
              <KanbanBoard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/vehicles"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Dispatcher']}>
            <DashboardLayout>
              <Vehicles />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/drivers"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Dispatcher']}>
            <DashboardLayout>
              <Drivers />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Shared Tracking Map - accessible by drivers and staff */}
      <Route
        path="/tracking"
        element={
          <ProtectedRoute allowedRoles={['Admin', 'Dispatcher', 'Warehouse Manager', 'Driver']}>
            <DashboardLayout>
              <LiveTracking />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Driver Workspace portal */}
      <Route
        path="/driver-portal"
        element={
          <ProtectedRoute allowedRoles={['Driver']}>
            <DashboardLayout>
              <DriverPortal />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback routing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
