import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Stethoscope, ArrowRight } from 'lucide-react';
import { getVerifiedOrganizations } from '../../api/public.api';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';

export default function VerifiedPartnersSection() {
  const [orgs, setOrs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getVerifiedOrganizations(6)
      .then((res) => {
        if (mounted && res?.success && Array.isArray(res.data)) {
          setOrs(res.data);
        }
      })
      .catch(() => {
        if (mounted) setOrs([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="for-ngos" className="py-16 md:py-24 bg-teal-50/20 border-t border-teal-900/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Verified Health Partners</span>
            </div>
            <h2 className="text-3xl font-extrabold text-text-heading tracking-tight">
              Our Community Healthcare Network
            </h2>
            <p className="text-sm text-text-body mt-2 leading-relaxed">
              Transparent roster of verified non-profit dispensaries and charitable clinics operating across the country.
            </p>
          </div>

          <Link to="/for-ngos" className="flex-shrink-0">
            <Button variant="outline" size="sm">
              <span>NGO Requirements & Docs</span>
              <ArrowRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-3xl bg-white/80 border border-teal-100/60 p-6 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && orgs.length === 0 && (
          <div className="p-8 sm:p-12 rounded-3xl bg-white border border-teal-100 shadow-soft max-w-2xl mx-auto text-center">
            <EmptyState
              icon={Building2}
              title="Our first partner organizations will appear here after verification"
              description="Be the first charitable clinic or non-profit foundation to onboard and receive verified medicine donations."
              actionLabel="Register your organization"
              onAction={() => {
                window.location.href = '/register';
              }}
            />
          </div>
        )}

        {/* Real Orgs Cards List */}
        {!loading && orgs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orgs.map((org, idx) => (
              <div
                key={org._id || idx}
                className="p-6 rounded-3xl bg-white border border-teal-100 shadow-soft hover:shadow-hover transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <Badge color={org.type === 'charitable_clinic' ? 'info' : 'primary'}>
                      {org.type === 'charitable_clinic' ? 'Charitable Clinic' : 'Non-Profit NGO'}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                      <MapPin size={13} className="text-teal-600" />
                      <span>{org.city}{org.state ? `, ${org.state}` : ''}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-text-heading mb-2">
                    {org.name}
                  </h3>

                  {Array.isArray(org.servicesOffered) && org.servicesOffered.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {org.servicesOffered.slice(0, 3).map((svc, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md"
                        >
                          {svc.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-xs text-teal-700 font-semibold">
                  <div className="flex items-center gap-1">
                    <Stethoscope size={14} />
                    <span>Verified Dispenser</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-bold">Active Member</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
