import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Search,
  PlusCircle,
  Eye,
  Trash2,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  AlertOctagon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { getMyDonations, deleteDraftDonation } from '../../api/donation.api';
import { useDebounce } from '../../hooks/useDebounce';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'under_verification', label: 'In Review' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function MyDonations() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [donations, setDonations] = useState([]);
  const [counts, setCounts] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Delete draft confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDonations = async (page = 1) => {
    try {
      setLoading(true);
      const res = await getMyDonations({
        status: activeTab,
        search: debouncedSearch,
        page,
        limit: 10,
      });

      if (res?.data) {
        setDonations(res.data.donations || []);
        setPagination(res.data.pagination || { page: 1, limit: 10, totalPages: 1, total: 0 });
        setCounts(res.data.counts || {});
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch donations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations(1);
  }, [activeTab, debouncedSearch]);

  const handleDeleteDraft = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteDraftDonation(deleteTarget._id);
      toast.success('Draft donation deleted.');
      setDeleteTarget(null);
      fetchDonations(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete draft.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-text-heading">
            My Medicine Donations
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Track verification status, automated screening results, and distribution history.
          </p>
        </div>

        <Link to="/donor/donate">
          <Button variant="primary" size="md" className="text-xs font-bold shadow-sm">
            <PlusCircle size={15} className="mr-1.5" />
            <span>New Donation</span>
          </Button>
        </Link>
      </div>

      {/* Tabs & Search Filter */}
      <Card className="p-4 bg-white border border-slate-100 shadow-soft space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs with count badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {TABS.map((tab) => {
              const count = counts[tab.id] ?? 0;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-50 text-text-body hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-64 flex-shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code or medicine name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-teal-600 focus:bg-white"
            />
          </div>
        </div>
      </Card>

      {/* Donations List / Table */}
      {loading ? (
        <Card className="p-12 text-center bg-white border border-slate-100 shadow-soft">
          <Spinner size="md" />
          <p className="text-xs text-text-muted mt-2 font-medium">Loading your donations...</p>
        </Card>
      ) : donations.length === 0 ? (
        <Card className="p-8 text-center bg-white border border-slate-100 shadow-soft">
          <EmptyState
            icon={Package}
            title={search ? 'No Matching Donations Found' : 'No Donations in this Tab'}
            description={
              search
                ? `No donations found matching "${search}". Try searching for another medicine or code.`
                : 'You have no donations recorded under this status category.'
            }
            action={
              <Link to="/donor/donate">
                <Button variant="outline" size="sm" className="text-xs">
                  <PlusCircle size={14} className="mr-1.5" />
                  Donate Medicines
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-soft overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-text-muted font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-5">Donation Code</th>
                  <th className="py-3 px-5">Medicines Included</th>
                  <th className="py-3 px-5">Pickup Location</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Submitted / Created</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {donations.map((don) => (
                  <tr key={don._id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Code */}
                    <td className="py-3.5 px-5 font-mono font-bold text-teal-900">
                      {don.donationCode || <span className="text-amber-700 italic">DRAFT</span>}
                    </td>

                    {/* Medicines */}
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-text-heading line-clamp-1 max-w-xs">
                        {don.items?.map((i) => i.name).join(', ') || 'No medicines'}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {don.items?.length || 0} item(s) • Total Qty:{' '}
                        {don.items?.reduce((acc, curr) => acc + (curr.quantity || 0), 0)}
                      </p>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-5">
                      <p className="text-text-heading font-medium">{don.pickupAddress?.city || '—'}</p>
                      <p className="text-[11px] text-text-muted truncate max-w-[140px]">
                        {don.pickupAddress?.line1}
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-5">
                      <StatusBadge status={don.status} size="xs" />
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-5 text-text-muted">
                      {new Date(don.submittedAt || don.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right space-x-1">
                      {don.status === 'draft' ? (
                        <>
                          <Link to={`/donor/donate/${don._id}`}>
                            <Button variant="outline" size="xs" className="text-teal-700">
                              Continue
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setDeleteTarget(don)}
                            className="text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </>
                      ) : (
                        <Link to={`/donor/donations/${don._id}`}>
                          <Button variant="outline" size="xs" className="text-slate-700">
                            <Eye size={12} className="mr-1" />
                            Details
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {donations.map((don) => (
              <Card key={don._id} className="p-4 bg-white border border-slate-200 shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-teal-900">
                    {don.donationCode || <span className="text-amber-700">DRAFT</span>}
                  </span>
                  <StatusBadge status={don.status} size="xs" />
                </div>

                <div>
                  <p className="text-xs font-bold text-text-heading">
                    {don.items?.map((i) => i.name).join(', ') || 'No medicines added'}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {don.items?.length || 0} item(s) • {don.pickupAddress?.city}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-text-muted text-[11px]">
                    {new Date(don.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    {don.status === 'draft' ? (
                      <>
                        <Link to={`/donor/donate/${don._id}`}>
                          <Button variant="outline" size="xs" className="text-teal-700 py-1">
                            Continue
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setDeleteTarget(don)}
                          className="text-rose-600"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </>
                    ) : (
                      <Link to={`/donor/donations/${don._id}`}>
                        <Button variant="outline" size="xs" className="text-slate-700 py-1">
                          Details
                          <ArrowRight size={12} className="ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-text-muted">
                Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} donations)
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDonations(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-2.5 py-1 text-xs"
                >
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDonations(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-2.5 py-1 text-xs"
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Draft Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Draft Donation"
      >
        <div className="space-y-4 text-xs text-text-body">
          <p>
            Are you sure you want to permanently delete this draft donation? Any uploaded medicine
            photographs will also be removed from storage.
          </p>
          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeleteDraft}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 font-bold"
            >
              {deleting ? 'Deleting...' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

