import React from 'react';
import { Outlet } from 'react-router';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { AdminNavbar } from '../components/layout/AdminNavbar';

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-row selection:bg-cyan-500 selection:text-white">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children || <Outlet />}
        </main>
        <footer className="w-full glass-panel border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
          <p>© 2026 E-Logistic Operations & Admin Control Center. Tất cả quyền được bảo lưu.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;
