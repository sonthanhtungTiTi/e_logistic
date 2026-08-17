import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { UserRole } from '@/types/auth.types';
import { RoleBaseRoute } from './RoleBaseRoute';
import { AdminLayout } from '@/layouts/AdminLayout';
import { DriverLayout } from '@/layouts/DriverLayout';

// Pages
import { WarehouseInboundPage } from '@/pages/warehouse/WarehouseInboundPage';
import { WarehouseOutboundPage } from '@/pages/warehouse/WarehouseOutboundPage';
import { WarehouseAuditPage } from '@/pages/warehouse/WarehouseAuditPage';
import { WarehouseInventoryDashboardPage } from '@/pages/warehouse/WarehouseInventoryDashboardPage';
import { DriverPickupPage } from '@/pages/driver/DriverPickupPage';
import { DriverHandoffPage } from '@/pages/driver/DriverHandoffPage';
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage';
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage';

// Operations Pages
import { OperationsDashboardPage } from '@/pages/dashboard/OperationsDashboardPage';
import { GlobalOrderListPage } from '@/pages/orders/GlobalOrderListPage';
import { RiskReviewPage } from '@/pages/orders/RiskReviewPage';
import { DispatchControlPage } from '@/pages/dispatch/DispatchControlPage';
import { UserManagementPage } from '@/pages/users/UserManagementPage';
import { SecurityAuditPage } from '@/pages/security/SecurityAuditPage';
import { SlaReportPage } from '@/pages/reports/SlaReportPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<AdminLoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* 1. Luồng DESKTOP cho Kho & Operations Admin (Dùng AdminLayout) */}
      <Route
        element={
          <RoleBaseRoute
            allowedRoles={[
              UserRole.ADMIN,
              UserRole.HUB_STAFF,
              UserRole.WAREHOUSE_STAFF,
              UserRole.HUB_COORDINATOR,
              UserRole.ACCOUNTANT,
              UserRole.CS,
              UserRole.CUSTOMER_SERVICE,
              UserRole.OPERATIONS,
              UserRole.DISPATCHER,
            ]}
          />
        }
      >
        <Route element={<AdminLayout />}>
          <Route path="/warehouse/inbound" element={<WarehouseInboundPage />} />
          <Route path="/warehouse/outbound" element={<WarehouseOutboundPage />} />
          <Route path="/warehouse/audit" element={<WarehouseAuditPage />} />
          <Route path="/warehouse/inventory" element={<WarehouseInventoryDashboardPage />} />
          <Route path="/admin/dashboard" element={<OperationsDashboardPage />} />
          <Route path="/admin/orders" element={<GlobalOrderListPage />} />
          <Route path="/admin/orders/:id/review" element={<RiskReviewPage />} />
          <Route path="/admin/dispatch" element={<DispatchControlPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/security" element={<SecurityAuditPage />} />
          <Route path="/admin/reports" element={<SlaReportPage />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/warehouse" element={<Navigate to="/warehouse/inbound" replace />} />
        </Route>
      </Route>

      {/* 2. Luồng MOBILE PWA cho Tài xế (Dùng DriverLayout) */}
      <Route
        element={
          <RoleBaseRoute
            allowedRoles={[UserRole.DRIVER, UserRole.LINE_HAUL_DRIVER, UserRole.ADMIN]}
          />
        }
      >
        <Route element={<DriverLayout />}>
          <Route path="/driver/pickup" element={<DriverPickupPage />} />
          <Route path="/driver/handoff" element={<DriverHandoffPage />} />
          <Route path="/driver" element={<Navigate to="/driver/pickup" replace />} />
        </Route>
      </Route>

      {/* Fallback route — chưa login → về trang login */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
};

export default AppRoutes;
