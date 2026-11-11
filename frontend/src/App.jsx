import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'text-sm font-medium rounded-xl shadow-hover border border-teal-900/10',
            duration: 4000,
            style: {
              background: '#FFFFFF',
              color: '#1E293B',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
