import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Stethoscope,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { getAdminUsers, reviewUser } from '../../api/admin.api';
import { useDebounce } from '../../hooks/useDebounce';

export default function AdminPharmacists() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'pending';

  const [activeTab, setActiveTab] = useState(initialStatus);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const [page, setPage] = useState(1);
  const [data, setData] = useState({ users: [], total: 0, totalPages: 1, counts: {} });
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approved' | 'rejected'
  const [reviewNote, setReviewNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPharmacists = async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers({
        role: 'pharmacist',
        approvalStatus: activeTab !== 'all' ? activeTab : undefined,
        search: debouncedSearch || undefined,
        page,
        limit: 10,
      });
      if (res?.success) {
        setData(res.data);
      }
    } catch {
      toast.error('Failed to load pharmacists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPharmacists();
  }, [activeTab, debouncedSearch, page]);

  const handleOpenAction = (user, type) => {
    setSelectedUser(user);
    setActionType(type);
    setReviewNote(type === 'approved' ? 'License verified with state pharmacy council records.' : '');
  };

  const handleConfirmReview = async () => {
    if (actionType === 'rejected' && (!reviewNote || reviewNote.trim().length < 10)) {
      toast.error('A rejection reason note of at least 10 characters is required.');
      return;
    }

    setActionLoading(true);
    try {
      await reviewUser(selectedUser._id, {
        decision: actionType,
        note: reviewNote.trim(),
      });
      toast.success(
        `Pharmacist ${selectedUser.name} has been ${actionType === 'approved' ? 'approved' : 'rejected'}.`
      );
      setSelectedUser(null);
      fetchPharmacists();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const counts = data.counts || {};

  const tabs = [
    { id: 'pending', label: 'Pending Review', count: counts.pendingPharmacists ?? 0, color: 'amber' },
    { id: 'approved', label: 'Approved', count: counts.approvedPharmacists ?? 0, color: 'teal' },
    { id: 'rejected', label: 'Rejected', count: counts.rejectedPharmacists ?? 0, color: 'rose' },
    { id: 'all', label: 'All Pharmacists', count: (counts.pendingPharmacists ?? 0) + (counts.approvedPharmacists ?? 0) + (counts.rejectedPharmacists ?? 0), color: 'slate' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-heading">
          Pharmacist Credential Verification
        </h1>
        <p className="text-xs sm:text-sm text-text-muted mt-0.5">
          Review state pharmacy council registration numbers and grant inspection privileges.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
                setSearchParams({ status: tab.id });
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-sky-700 text-white shadow-soft'
                  : 'bg-white text-text-body hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Toolbar */}
      <Card className="p-4 bg-white shadow-soft">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by pharmacist name, license number, or pharmacy..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
      </Card>

      {/* Table / Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-text-muted">Loading pharmacists...</p>
        </div>
      ) : data.users.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No Pharmacists Found"
          description={`No pharmacist accounts matching status "${activeTab}".`}
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-teal-900/10 bg-white shadow-soft">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-text-muted font-bold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Pharmacist</th>
                  <th className="px-5 py-3.5">License Number</th>
                  <th className="px-5 py-3.5">Pharmacy / Institution</th>
                  <th className="px-5 py-3.5">Registration State</th>
                  <th className="px-5 py-3.5">Experience</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.users.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-text-heading text-sm">{item.name}</p>
                      <p className="text-text-muted text-[11px]">{item.email} • {item.phone}</p>
                    </td>
                    <td className="px-5 py-4 font-mono font-semibold text-teal-800">
                      {item.pharmacistProfile?.licenseNumber || 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-text-body">
                      {item.pharmacistProfile?.pharmacyName || 'Independent'}
                    </td>
                    <td className="px-5 py-4 text-text-body">
                      {item.pharmacistProfile?.registrationState || item.state || 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-text-body">
                      {item.pharmacistProfile?.experienceYears || 0} years
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        color={
                          item.approvalStatus === 'approved'
                            ? 'success'
                            : item.approvalStatus === 'pending'
                            ? 'warning'
                            : 'danger'
                        }
                        className="capitalize"
                      >
                        {item.approvalStatus}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {item.approvalStatus === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleOpenAction(item, 'rejected')}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenAction(item, 'approved')}
                          >
                            Approve
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-text-muted">
                          {item.approvalStatus === 'approved' ? 'Verified' : 'Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="lg:hidden space-y-3">
            {data.users.map((item) => (
              <Card key={item._id} className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-text-heading">{item.name}</h3>
                    <p className="text-xs text-text-muted">Lic: {item.pharmacistProfile?.licenseNumber}</p>
                  </div>
                  <Badge
                    color={
                      item.approvalStatus === 'approved'
                        ? 'success'
                        : item.approvalStatus === 'pending'
                        ? 'warning'
                        : 'danger'
                    }
                    className="capitalize text-[10px]"
                  >
                    {item.approvalStatus}
                  </Badge>
                </div>
                <div className="text-xs text-text-body space-y-1">
                  <p>Pharmacy: {item.pharmacistProfile?.pharmacyName}</p>
                  <p>State: {item.pharmacistProfile?.registrationState}</p>
                </div>
                {item.approvalStatus === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleOpenAction(item, 'rejected')}
                      className="flex-1"
                    >
                      Reject
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenAction(item, 'approved')}
                      className="flex-1"
                    >
                      Approve
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs text-text-muted">
                Page {data.page} of {data.totalPages} ({data.total} pharmacists)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={16} />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={actionType === 'approved' ? 'Approve Pharmacist License' : 'Reject Pharmacist Application'}
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-text-body leading-relaxed">
            {actionType === 'approved'
              ? `Confirm verification for ${selectedUser?.name} (License: ${selectedUser?.pharmacistProfile?.licenseNumber}). This grants them full verification privileges across donation queues.`
              : `Specify why the application for ${selectedUser?.name} is being rejected. This feedback will be sent via email.`}
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
              Review Note {actionType === 'rejected' && '* (Minimum 10 characters)'}
            </label>
            <textarea
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Enter review notes or reason..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-text-heading focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            {actionType === 'rejected' && (
              <span className="text-[10px] text-text-muted">{reviewNote.length} characters (min 10)</span>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'approved' ? 'primary' : 'danger'}
              loading={actionLoading}
              onClick={handleConfirmReview}
            >
              Confirm {actionType === 'approved' ? 'Approval' : 'Rejection'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

