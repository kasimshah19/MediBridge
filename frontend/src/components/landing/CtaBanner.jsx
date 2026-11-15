import { Link } from 'react-router-dom';
import { HeartHandshake, Building2, ArrowRight, ShieldCheck } from 'lucide-react';
import Button from '../ui/Button';

export default function CtaBanner() {
  return (
    <section className="py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-teal-700 via-teal-600 to-sky-600 text-white p-8 sm:p-12 md:p-16 shadow-xl">
          {/* Decorative background circles */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-teal-400/20 blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold">
              <ShieldCheck size={16} className="text-teal-200" />
              <span>Certified Community Medicine Exchange</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Ready to Bridge the Healthcare Gap in Your City?
            </h2>

            <p className="text-sm sm:text-base text-teal-50 max-w-2xl mx-auto leading-relaxed">
              Whether you have unexpired medicines at home or manage a charitable dispensary serving patients, your participation saves lives today.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link to="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white text-teal-800 hover:bg-teal-50 shadow-md font-bold"
                >
                  <HeartHandshake className="w-5 h-5 mr-1 text-teal-700" />
                  Donate Medicines Now
                  <ArrowRight className="w-4 h-4 ml-1 text-teal-700" />
                </Button>
              </Link>
              <Link to="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-teal-900/40 hover:bg-teal-900/60 text-white border border-white/30 backdrop-blur-md font-semibold"
                >
                  <Building2 className="w-5 h-5 mr-1" />
                  Register Your NGO / Clinic
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
