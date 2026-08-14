import { AdminAuthProvider } from './context/AdminAuthContext';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  return (
    <AdminAuthProvider>
      <AppRoutes />
    </AdminAuthProvider>
  );
}

export default App;
