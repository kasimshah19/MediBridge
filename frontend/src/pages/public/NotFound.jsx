import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6 bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-teal-900/10 shadow-soft">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200/80 text-teal-600 flex items-center justify-center mx-auto">
          <FileQuestion className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600">404 Error</span>
          <h2 className="text-2xl font-heading font-extrabold text-text-heading">Page Not Found</h2>
          <p className="text-sm text-text-body leading-relaxed">
            The page or resource you requested does not exist or has been relocated within the MediBridge network.
          </p>
        </div>
        <div>
          <Link to="/">
            <Button variant="primary" size="md" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Platform Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

