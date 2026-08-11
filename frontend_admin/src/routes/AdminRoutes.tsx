import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { AdminLoginPage } from '../pages/auth/AdminLoginPage';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage';
import { OperationsDashboardPage } from '../pages/dashboard/OperationsDashboardPage';
import { DispatchControlPage } from '../pages/dispatch/DispatchControlPage';
import { UserManagementPage } from '../pages/users/UserManagementPage';
import { SecurityAuditPage } from '../pages/security/SecurityAuditPage';
import { SlaReportPage } from '../pages/reports/SlaReportPage';

// Order Module Pages (Matching Wireframes 3 & 4)
import { GlobalOrderListPage } from '../pages/orders/GlobalOrderListPage';
import { RiskReviewPage } from '../pages/orders/RiskReviewPage';

import { ProtectedAdminRoute } from './ProtectedAdminRoute';
import { RoleBaseRoute } from './RoleBaseRoute';

export const AdminRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Admin Auth */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Operations Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedAdminRoute>
            <OperationsDashboardPage />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedAdminRoute>
            <GlobalOrderListPage />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/orders/:id/review"
        element={
          <ProtectedAdminRoute>
            <RiskReviewPage />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/dispatch"
        element={
          <RoleBaseRoute allowedRoles={['ADMIN', 'OPERATIONS', 'DISPATCHER']}>
            <DispatchControlPage />
          </RoleBaseRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RoleBaseRoute allowedRoles={['ADMIN', 'OPERATIONS']}>
            <UserManagementPage />
          </RoleBaseRoute>
        }
      />
      <Route
        path="/admin/security"
        element={
          <RoleBaseRoute allowedRoles={['ADMIN']}>
            <SecurityAuditPage />
          </RoleBaseRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedAdminRoute>
            <SlaReportPage />
          </ProtectedAdminRoute>
        }
      />

      {/* Default fallback */}
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
};
