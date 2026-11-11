import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth, getDashboardPathForUser } from '../../context/AuthContext';

export default function Unauthorized() {
  const { user } = useAuth();
  const dashboardPath = getDashboardPathForUser(user);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center p-8 bg-white/90 backdrop-blur-md shadow-hover border border-rose-200/60">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4 shadow-soft">
          <ShieldX size={36} />
        </div>

        <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
          403 Access Forbidden
        </span>

        <h2 className="text-2xl font-heading font-extrabold text-text-heading mt-2 mb-3">
          Unauthorized Access
        </h2>

        <p className="text-sm text-text-body leading-relaxed mb-6">
          Your current account role (
          <strong className="capitalize text-teal-800">{user?.role || 'Guest'}</strong>
          ) is not permitted to access this area of the MediBridge platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to={dashboardPath} className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full">
              <Home size={16} className="mr-1.5" />
              <span>Go to My Dashboard</span>
            </Button>
          </Link>
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full">
              <ArrowLeft size={16} className="mr-1.5" />
              <span>Home</span>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

