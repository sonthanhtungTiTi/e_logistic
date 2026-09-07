import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { UserRole } from '@/types/auth.types';
import { RoleBaseRoute } from './RoleBaseRoute';
import { AdminLayout } from '@/layouts/AdminLayout';
import { WarehouseLayout } from '@/layouts/WarehouseLayout';
import { ShipperLayout } from '@/layouts/ShipperLayout';
import { LineHaulLayout } from '@/layouts/LineHaulLayout';
import { DriverLayout } from '@/layouts/DriverLayout';
import { useAdminAuth } from '@/hooks/useAdminAuth';

// ── Warehouse / Operations Pages (chỉ HUB_STAFF / WAREHOUSE_STAFF / HUB_COORDINATOR) ──
import { WarehouseInboundPage } from '@/pages/warehouse/WarehouseInboundPage';
import { WarehouseBaggingPage } from '@/pages/warehouse/WarehouseBaggingPage';
import { WarehouseOutboundPage } from '@/pages/warehouse/WarehouseOutboundPage';
import { WarehouseAuditPage } from '@/pages/warehouse/WarehouseAuditPage';
import { WarehouseInventoryDashboardPage } from '@/pages/warehouse/WarehouseInventoryDashboardPage';

// ── Admin-only Pages ──────────────────────────────────────────────────────────
import { AdminLoginPage } from '@/pages/auth/AdminLoginPage';
import { UnauthorizedPage } from '@/pages/auth/UnauthorizedPage';
import { OperationsDashboardPage } from '@/pages/dashboard/OperationsDashboardPage';
import { GlobalOrderListPage } from '@/pages/orders/GlobalOrderListPage';
import { RiskReviewPage } from '@/pages/orders/RiskReviewPage';
import { UserManagementPage } from '@/pages/users/UserManagementPage';
import { SecurityAuditPage } from '@/pages/security/SecurityAuditPage';
import { SlaReportPage } from '@/pages/reports/SlaReportPage';
import { VendorOpsPage } from '@/pages/vendorOps/VendorOpsPage';
import { LocalDispatchPage } from '@/pages/dispatch/LocalDispatchPage';
import { LineHaulDispatchPage } from '@/pages/dispatch/LineHaulDispatchPage';

// ── Shipper PWA Pages ─────────────────────────────────────────────────────────
import { ShipperZonePage } from '@/pages/shipper/ShipperZonePage';
import { ShipperPickupPage } from '@/pages/shipper/ShipperPickupPage';
import { ShipperDeliveryPage } from '@/pages/shipper/ShipperDeliveryPage';
import { ShipperWalletPage } from '@/pages/shipper/ShipperWalletPage';
import { ShipperProfilePage } from '@/pages/shipper/ShipperProfilePage';

// ── Line-haul Driver PWA Pages ────────────────────────────────────────────────
import { LineHaulTripsPage } from '@/pages/linehaul/LineHaulTripsPage';
import { LineHaulHandoffPage } from '@/pages/linehaul/LineHaulHandoffPage';
import { LineHaulTransitPage } from '@/pages/linehaul/LineHaulTransitPage';

// ── Legacy Driver Pages ───────────────────────────────────────────────────────
import { DriverPickupPage } from '@/pages/driver/DriverPickupPage';
import { DriverHandoffPage } from '@/pages/driver/DriverHandoffPage';

// ─── Role groups ──────────────────────────────────────────────────────────────
const ADMIN_ROLES = [UserRole.ADMIN] as const;

const WAREHOUSE_ROLES = [
  UserRole.HUB_STAFF,
  UserRole.WAREHOUSE_STAFF,
  UserRole.HUB_COORDINATOR,
] as const;

const DISPATCH_ROLES_LOCAL = [
  UserRole.ADMIN,
  UserRole.LAST_MILE_DISPATCHER,
  UserRole.DISPATCHER,
  UserRole.OPERATIONS,
] as const;

const DISPATCH_ROLES_LINEHAUL = [
  UserRole.ADMIN,
  UserRole.LINE_HAUL_DISPATCHER,
  UserRole.DISPATCHER,
  UserRole.OPERATIONS,
] as const;

const VENDOR_OPS_ROLES = [UserRole.ADMIN, UserRole.ORDER_VENDOR_MANAGER] as const;

const DASHBOARD_ROLES = [
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.DISPATCHER,
  UserRole.HUB_COORDINATOR,
] as const;

const ORDER_LIST_ROLES = [
  UserRole.ADMIN,
  UserRole.OPERATIONS,
  UserRole.DISPATCHER,
  UserRole.ACCOUNTANT,
  UserRole.CS,
  UserRole.CUSTOMER_SERVICE,
] as const;

const SHIPPER_ROLES = [
  UserRole.SHIPPER,
  UserRole.LOCAL_SHIPPER,
  'SHIPPER',
  'LOCAL_SHIPPER',
] as const;

const DRIVER_ROLES = [
  UserRole.LINE_HAUL_DRIVER,
  UserRole.DRIVER,
  'LINE_HAUL_DRIVER',
  'DRIVER',
] as const;

// ─── Root redirect theo role ──────────────────────────────────────────────────
const RootRedirect: React.FC = () => {
  const { user } = useAdminAuth();
  if (!user) return <Navigate to="/admin/login" replace />;

  const role = (user.role || '').toString();
  if (
    role === 'SHIPPER' ||
    role === 'LOCAL_SHIPPER' ||
    role === UserRole.SHIPPER ||
    role === UserRole.LOCAL_SHIPPER
  ) {
    return <Navigate to="/shipper/zone" replace />;
  }
  if (
    role === 'LINE_HAUL_DRIVER' ||
    role === UserRole.LINE_HAUL_DRIVER ||
    role === 'DRIVER' ||
    role === UserRole.DRIVER
  ) {
    return <Navigate to="/linehaul/trips" replace />;
  }
  if (role === UserRole.ORDER_VENDOR_MANAGER || role === 'ORDER_VENDOR_MANAGER') {
    return <Navigate to="/admin/vendor-ops" replace />;
  }
  if (role === UserRole.LAST_MILE_DISPATCHER || role === 'LAST_MILE_DISPATCHER') {
    return <Navigate to="/admin/dispatch/local" replace />;
  }
  if (role === UserRole.LINE_HAUL_DISPATCHER || role === 'LINE_HAUL_DISPATCHER') {
    return <Navigate to="/admin/dispatch/linehaul" replace />;
  }
  if (
    role === UserRole.HUB_STAFF ||
    role === UserRole.WAREHOUSE_STAFF ||
    role === UserRole.HUB_COORDINATOR ||
    role === 'HUB_STAFF' ||
    role === 'WAREHOUSE_STAFF' ||
    role === 'HUB_COORDINATOR'
  ) {
    return <Navigate to="/warehouse/inbound" replace />;
  }
  // ADMIN và các role còn lại → Admin dashboard
  return <Navigate to="/admin/dashboard" replace />;
};

// ─── Routes ──────────────────────────────────────────────────────────────────
export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth */}
      <Route path="/login" element={<AdminLoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ═══════════════════════════════════════════════════════════════════
          1. ADMIN — Quản trị hệ thống (Dashboard, Users, Security, Reports)
             Không có quyền vào /warehouse/*
          ═══════════════════════════════════════════════════════════════════ */}
      <Route element={<RoleBaseRoute allowedRoles={[...DASHBOARD_ROLES, ...DISPATCH_ROLES_LOCAL, ...DISPATCH_ROLES_LINEHAUL, ...VENDOR_OPS_ROLES, ...ORDER_LIST_ROLES]} />}>
        <Route element={<AdminLayout />}>
          {/* Dashboard & Order oversight */}
          <Route path="/admin/dashboard" element={<RoleBaseRoute allowedRoles={[...DASHBOARD_ROLES]} />}>
            <Route index element={<OperationsDashboardPage />} />
          </Route>

          <Route path="/admin/orders" element={<RoleBaseRoute allowedRoles={[...ORDER_LIST_ROLES]} />}>
            <Route index element={<GlobalOrderListPage />} />
          </Route>

          <Route path="/admin/orders/:id/review" element={<RoleBaseRoute allowedRoles={[...ADMIN_ROLES]} />}>
            <Route index element={<RiskReviewPage />} />
          </Route>

          {/* Vendor Ops (QL 1) */}
          <Route element={<RoleBaseRoute allowedRoles={[...VENDOR_OPS_ROLES]} />}>
            <Route path="/admin/vendor-ops" element={<VendorOpsPage />} />
          </Route>

          {/* Local Dispatch (QL 2) */}
          <Route element={<RoleBaseRoute allowedRoles={[...DISPATCH_ROLES_LOCAL]} />}>
            <Route path="/admin/dispatch/local" element={<LocalDispatchPage />} />
          </Route>

          {/* Linehaul Dispatch (QL 3) */}
          <Route element={<RoleBaseRoute allowedRoles={[...DISPATCH_ROLES_LINEHAUL]} />}>
            <Route path="/admin/dispatch/linehaul" element={<LineHaulDispatchPage />} />
          </Route>

          <Route path="/admin/dispatch" element={<Navigate to="/admin/dispatch/local" replace />} />

          {/* Admin-only: User management & Security */}
          <Route element={<RoleBaseRoute allowedRoles={[...ADMIN_ROLES]} />}>
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/security" element={<SecurityAuditPage />} />
          </Route>

          {/* SLA Reports */}
          <Route element={<RoleBaseRoute allowedRoles={[UserRole.ADMIN, UserRole.OPERATIONS]} />}>
            <Route path="/admin/reports" element={<SlaReportPage />} />
          </Route>

          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        </Route>
      </Route>

      {/* ═══════════════════════════════════════════════════════════════════
          2. WAREHOUSE — Tác nghiệp kho vận
             Chỉ HUB_STAFF / WAREHOUSE_STAFF / HUB_COORDINATOR
             ADMIN không có quyền vào nhóm route này (Phương án A)
          ═══════════════════════════════════════════════════════════════════ */}
      <Route element={<RoleBaseRoute allowedRoles={[...WAREHOUSE_ROLES]} />}>
        <Route element={<WarehouseLayout />}>
          <Route path="/warehouse/inbound"   element={<WarehouseInboundPage />} />
          <Route path="/warehouse/bagging"   element={<WarehouseBaggingPage />} />
          <Route path="/warehouse/outbound"  element={<WarehouseOutboundPage />} />
          <Route path="/warehouse/audit"     element={<WarehouseAuditPage />} />
          <Route path="/warehouse/inventory" element={<WarehouseInventoryDashboardPage />} />

          {/* Tra cứu đơn dành cho HUB_STAFF (read-only) */}
          <Route path="/warehouse/orders" element={<RoleBaseRoute allowedRoles={[...WAREHOUSE_ROLES]} />}>
            <Route index element={<GlobalOrderListPage />} />
          </Route>

          <Route path="/warehouse" element={<Navigate to="/warehouse/inbound" replace />} />
        </Route>
      </Route>

      {/* ═══════════════════════════════════════════════════════════════════
          3. SHIPPER nội thành (PWA Mobile)
          ═══════════════════════════════════════════════════════════════════ */}
      <Route element={<RoleBaseRoute allowedRoles={[...SHIPPER_ROLES]} />}>
        <Route element={<ShipperLayout />}>
          <Route path="/shipper/zone"     element={<ShipperZonePage />} />
          <Route path="/shipper/pickup"   element={<ShipperPickupPage />} />
          <Route path="/shipper/delivery" element={<ShipperDeliveryPage />} />
          <Route path="/shipper/wallet"   element={<ShipperWalletPage />} />
          <Route path="/shipper/profile"  element={<ShipperProfilePage />} />
          <Route path="/shipper" element={<Navigate to="/shipper/zone" replace />} />
        </Route>
      </Route>

      {/* ═══════════════════════════════════════════════════════════════════
          4. DRIVER xe tải liên tỉnh (PWA Mobile)
          ═══════════════════════════════════════════════════════════════════ */}
      <Route element={<RoleBaseRoute allowedRoles={[...DRIVER_ROLES]} />}>
        <Route element={<LineHaulLayout />}>
          <Route path="/linehaul/trips"   element={<LineHaulTripsPage />} />
          <Route path="/linehaul/handoff" element={<LineHaulHandoffPage />} />
          <Route path="/linehaul/transit" element={<LineHaulTransitPage />} />
          <Route path="/linehaul" element={<Navigate to="/linehaul/trips" replace />} />
        </Route>
      </Route>

      {/* ═══════════════════════════════════════════════════════════════════
          5. Legacy Driver (tương thích ngược)
          ═══════════════════════════════════════════════════════════════════ */}
      <Route element={<RoleBaseRoute allowedRoles={[...DRIVER_ROLES]} />}>
        <Route element={<DriverLayout />}>
          <Route path="/driver/pickup"  element={<DriverPickupPage />} />
          <Route path="/driver/handoff" element={<DriverHandoffPage />} />
          <Route path="/driver" element={<Navigate to="/driver/pickup" replace />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};

export default AppRoutes;
