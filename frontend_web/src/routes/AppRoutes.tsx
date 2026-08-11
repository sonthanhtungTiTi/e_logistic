import React from 'react';
import { Routes, Route } from 'react-router';
import { LandingPage } from '../pages/public/LandingPage';
import { PricingPage } from '../pages/public/PricingPage';
import { PublicTrackingPage } from '../pages/public/PublicTrackingPage';

import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';

import { SellerDashboardPage } from '../pages/seller/SellerDashboardPage';
import { OrderListPage } from '../pages/seller/OrderListPage';
import { CreateOrderPage } from '../pages/seller/CreateOrderPage';
import { BatchOrderPage } from '../pages/seller/BatchOrderPage';
import { CodWalletPage } from '../pages/seller/CodWalletPage';
import { PayoutHistoryPage } from '../pages/seller/PayoutHistoryPage';
import { TicketListPage } from '../pages/seller/TicketListPage';
import { CreateTicketPage } from '../pages/seller/CreateTicketPage';
import { ProfilePage } from '../pages/seller/ProfilePage';

import { ProtectedRoute } from './ProtectedRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/tracking" element={<PublicTrackingPage />} />

      {/* Auth Routes */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register" element={<RegisterPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

      {/* Seller Protected Routes */}
      <Route
        path="/seller/dashboard"
        element={
          <ProtectedRoute>
            <SellerDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/orders"
        element={
          <ProtectedRoute>
            <OrderListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/orders/create"
        element={
          <ProtectedRoute>
            <CreateOrderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/orders/batch"
        element={
          <ProtectedRoute>
            <BatchOrderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/wallet"
        element={
          <ProtectedRoute>
            <CodWalletPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/payouts"
        element={
          <ProtectedRoute>
            <PayoutHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/tickets"
        element={
          <ProtectedRoute>
            <TicketListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/tickets/create"
        element={
          <ProtectedRoute>
            <CreateTicketPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};
