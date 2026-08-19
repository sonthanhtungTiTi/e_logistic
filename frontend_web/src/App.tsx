import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Sidebar } from './components/layout/Sidebar';
import { AppRoutes } from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';

export function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white">
        <Navbar />
        <div className="flex-1 w-full flex">
          {/* PERSISTENT FIXED LEFT SIDEBAR (Thanh Menu Cố Định Bên Trái Hiển Thị Luôn) */}
          <Sidebar />

          <main className="flex-1 min-w-0 w-full p-4 sm:p-6 pb-16">
            <AppRoutes />
          </main>
        </div>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
