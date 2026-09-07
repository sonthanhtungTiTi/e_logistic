import { AdminAuthProvider } from './context/AdminAuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppRoutes } from './routes/AppRoutes';
import { Toaster } from 'sonner';

export function App() {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <Toaster position="top-right" theme="dark" richColors />
        <AppRoutes />
      </AdminAuthProvider>
    </ThemeProvider>
  );
}

export default App;
