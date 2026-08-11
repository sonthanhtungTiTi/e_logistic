import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { AppRoutes } from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';

export function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
          <AppRoutes />
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
