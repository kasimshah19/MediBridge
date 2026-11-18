import { useState, useEffect } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  User,
  Copy,
  Check,
  ExternalLink,
  PackageCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Drawer from '../ui/Drawer';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import DistanceBadge from './DistanceBadge';
import { getHandoverDetails } from '../../api/claim.api';

export default function HandoverDetailsDrawer({
  isOpen,
  onClose,
  claimId,
  userRole = 'donor',
}) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    if (isOpen && claimId) {
      loadDetails();
    } else {
      setDetails(null);
    }
  }, [isOpen, claimId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const res = await getHandoverDetails(claimId);
      setDetails(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlock handover contact details.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Match Handover & Contact Coordinates"
      size="md"
    >
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <span className="text-xs text-slate-500">Unlocking contact details...</span>
        </div>
      ) : details ? (
        <div className="space-y-6 pb-6">
          {/* Privacy & Verification Banner */}
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-semibold text-emerald-950">Match Accepted & Confirmed</h4>
              <p className="text-emerald-800 mt-0.5 leading-relaxed">
                Contact and pickup details have been unlocked for mutual coordination. Please get in touch to finalize handover timings.
              </p>
              <div className="mt-2 flex items-center gap-3 text-[11px] font-mono text-emerald-900">
                <span>Claim: {details.claimCode}</span>
                <span>•</span>
                <DistanceBadge distanceKm={details.distanceKm} />
              </div>
            </div>
          </div>

          {/* Donor Pickup Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-primary-600" />
              <h3 className="text-sm font-bold text-slate-900">Donor Information (Pickup Point)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-medium uppercase">Name</span>
                <span className="font-semibold text-slate-800">{details.donor.name}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-medium uppercase">Contact Phone</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href={`tel:${details.donor.phone}`}
                    className="font-semibold text-teal-600 hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    {details.donor.phone}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(details.donor.phone, 'donor-phone')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {copiedKey === 'donor-phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {details.donor.pickupAddress && (
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-400 block text-[11px] font-medium uppercase mb-1">Pickup Address</span>
                <div className="flex items-start justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="space-y-0.5 text-slate-700">
                    <p className="font-medium">{details.donor.pickupAddress.line1}</p>
                    <p>{details.donor.pickupAddress.city}, {details.donor.pickupAddress.state} - {details.donor.pickupAddress.pincode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${details.donor.pickupAddress.line1}, ${details.donor.pickupAddress.city}, ${details.donor.pickupAddress.state} - ${details.donor.pickupAddress.pincode}`,
                        'donor-address'
                      )
                    }
                    className="text-slate-400 hover:text-slate-600 p-1 flex-shrink-0"
                    title="Copy Address"
                  >
                    {copiedKey === 'donor-address' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {details.donor.pickupTimings && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Preferred Timings: <strong>{details.donor.pickupTimings}</strong></span>
              </div>
            )}
          </div>

          {/* NGO Details Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Receiving Organization</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-medium uppercase">Organization</span>
                <span className="font-semibold text-slate-800">{details.organization.name}</span>
                {details.organization.registrationNumber && (
                  <span className="text-[11px] text-slate-500 block font-mono">
                    Reg: {details.organization.registrationNumber}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-medium uppercase">Contact Person</span>
                <span className="font-semibold text-slate-800">{details.organization.contactPerson}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-medium uppercase">Phone</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href={`tel:${details.organization.phone}`}
                    className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    {details.organization.phone}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(details.organization.phone, 'org-phone')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {copiedKey === 'org-phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-medium uppercase">Email</span>
                <a
                  href={`mailto:${details.organization.email}`}
                  className="font-medium text-slate-700 hover:underline flex items-center gap-1 mt-0.5 truncate"
                >
                  <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{details.organization.email}</span>
                </a>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-400 block text-[11px] font-medium uppercase mb-1">Office / Clinic Address</span>
              <p className="text-slate-700 font-medium">
                {details.organization.address}, {details.organization.city}, {details.organization.state} - {details.organization.pincode}
              </p>
            </div>
          </div>

          {/* Medicines Checklist for Handover */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Handover Medicines</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">{details.items?.length || 0} item(s)</span>
            </div>

            <div className="divide-y divide-slate-100">
              {details.items?.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-semibold text-slate-900">{item.name}</h5>
                    <p className="text-[11px] text-slate-500 font-mono">Batch: {item.batchNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
