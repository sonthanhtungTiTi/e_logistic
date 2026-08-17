import { AdminAuthProvider } from './context/AdminAuthContext';
import { AppRoutes } from './routes/AppRoutes';
import { Toaster } from 'sonner';

export function App() {
  return (
    <AdminAuthProvider>
      <Toaster position="top-right" theme="dark" richColors />
      <AppRoutes />
    </AdminAuthProvider>
  );
}

export default App;
