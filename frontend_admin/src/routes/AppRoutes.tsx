import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { UserRole } from '../types/auth.types';
import { RoleBaseRoute } from './RoleBaseRoute';
import { AdminLayout } from '../layouts/AdminLayout';
import { DriverLayout } from '../layouts/DriverLayout';

// Pages
import { WarehouseInboundPage } from '../modules/warehouse/pages/WarehouseInboundPage';
import { DriverPickupPage } from '../modules/driver/pages/DriverPickupPage';
import { AdminLoginPage } from '../pages/auth/AdminLoginPage';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';

// Operations Pages
import { OperationsDashboardPage } from '../pages/dashboard/OperationsDashboardPage';
import { GlobalOrderListPage } from '../pages/orders/GlobalOrderListPage';
import { RiskReviewPage } from '../pages/orders/RiskReviewPage';
import { DispatchControlPage } from '../pages/dispatch/DispatchControlPage';
import { UserManagementPage } from '../pages/users/UserManagementPage';
import { SecurityAuditPage } from '../pages/security/SecurityAuditPage';
import { SlaReportPage } from '../pages/reports/SlaReportPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<AdminLoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/unauthorized" element={<UnauthorizedPage />} />

      {/* 1. Luồng DESKTOP cho Nhân viên Kho (UC16 Inbound) */}
      <Route
        path="/warehouse"
        element={
          <RoleBaseRoute allowedRoles={[UserRole.WAREHOUSE_STAFF, UserRole.WAREHOUSE, UserRole.ADMIN, 'OPERATIONS']}>
            <AdminLayout />
          </RoleBaseRoute>
        }
      >
        <Route path="inbound" element={<WarehouseInboundPage />} />
        <Route index element={<Navigate to="inbound" replace />} />
      </Route>

      {/* 2. Luồng MOBILE PWA cho Tài xế (UC12 Driver Pickup) */}
      <Route
        path="/driver"
        element={
          <RoleBaseRoute allowedRoles={[UserRole.DRIVER, UserRole.ADMIN]}>
            <DriverLayout />
          </RoleBaseRoute>
        }
      >
        <Route path="pickup" element={<DriverPickupPage />} />
        <Route index element={<Navigate to="pickup" replace />} />
      </Route>

      {/* 3. Operations & Admin Management Routes */}
      <Route
        path="/admin"
        element={
          <RoleBaseRoute allowedRoles={['ADMIN', 'OPERATIONS', 'DISPATCHER']}>
            <AdminLayout />
          </RoleBaseRoute>
        }
      >
        <Route path="dashboard" element={<OperationsDashboardPage />} />
        <Route path="orders" element={<GlobalOrderListPage />} />
        <Route path="orders/:id/review" element={<RiskReviewPage />} />
        <Route path="dispatch" element={<DispatchControlPage />} />
        <Route path="users" element={<UserManagementPage />} />
        <Route path="security" element={<SecurityAuditPage />} />
        <Route path="reports" element={<SlaReportPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/warehouse/inbound" replace />} />
    </Routes>
  );
};

export default AppRoutes;
