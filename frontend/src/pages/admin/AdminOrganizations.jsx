import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import toast from 'react-hot-toast';
import {
  Building2,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  FileText,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Drawer from '../../components/ui/Drawer';
import Modal from '../../components/ui/Modal';
import {
  getAdminOrganizations,
  getAdminOrganizationById,
  reviewOrganization,
} from '../../api/admin.api';
import { getDocumentBlob } from '../../api/organization.api';
import { useDebounce } from '../../hooks/useDebounce';
import '../../utils/leafletSetup';
import { OSM_ATTRIBUTION } from '../../utils/leafletSetup';

export default function AdminOrganizations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'pending';

  const [activeTab, setActiveTab] = useState(initialStatus);
  const [selectedType, setSelectedType] = useState('');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(search, 400);

  const [page, setPage] = useState(1);
  const [data, setData] = useState({ organizations: [], total: 0, totalPages: 1, counts: {} });
  const [loading, setLoading] = useState(true);

  // Drawer & detail inspection state
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [detailOrg, setDetailOrg] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Review decision modals
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const res = await getAdminOrganizations({
        status: activeTab,
        type: selectedType || undefined,
        search: debouncedSearch || undefined,
        page,
        limit: 10,
      });
      if (res?.success) {
        setData(res.data);
      }
    } catch {
      toast.error('Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [activeTab, selectedType, debouncedSearch, page]);

  // Open organization detail drawer
  const handleOpenDetail = async (orgId) => {
    setSelectedOrgId(orgId);
    setLoadingDetail(true);
    try {
      const res = await getAdminOrganizationById(orgId);
      if (res?.success) {
        setDetailOrg(res.data.organization);
      }
    } catch {
      toast.error('Failed to load organization details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // View document as blob
  const handleViewDoc = async (orgId, docId) => {
    try {
      const blob = await getDocumentBlob(orgId, docId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      toast.error('Unable to open document file.');
    }
  };

  // Handle Verify Org
  const handleConfirmVerify = async () => {
    setActionLoading(true);
    try {
      await reviewOrganization(detailOrg._id, {
        decision: 'verified',
        note: 'All credentials and documents successfully audited by compliance administration.',
      });
      toast.success(`${detailOrg.name} verified successfully!`);
      setVerifyModalOpen(false);
      handleOpenDetail(detailOrg._id);
      fetchOrganizations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject Org
  const handleConfirmReject = async () => {
    if (!rejectReason || rejectReason.trim().length < 10) {
      toast.error('A rejection reason note of at least 10 characters is required.');
      return;
    }

    setActionLoading(true);
    try {
      await reviewOrganization(detailOrg._id, {
        decision: 'rejected',
        note: rejectReason.trim(),
      });
      toast.success(`${detailOrg.name} verification rejected.`);
      setRejectModalOpen(false);
      setRejectReason('');
      handleOpenDetail(detailOrg._id);
      fetchOrganizations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const counts = data.counts || {};

  const tabs = [
    { id: 'pending', label: 'Pending Review', count: counts.pending ?? 0, color: 'amber' },
    { id: 'verified', label: 'Verified', count: counts.verified ?? 0, color: 'teal' },
    { id: 'rejected', label: 'Rejected', count: counts.rejected ?? 0, color: 'rose' },
    { id: 'all', label: 'All Organizations', count: counts.all ?? 0, color: 'slate' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-heading">
            Organization Verification Management
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Audit non-profit registrations, facility licenses, and applicant credentials.
          </p>
        </div>
      </div>

      {/* Status Tabs */}
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
                  ? 'bg-teal-700 text-white shadow-soft'
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

      {/* Filter Toolbar */}
      <Card className="p-4 bg-white shadow-soft flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, reg no, or city..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-slate-400" />
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="">All Categories</option>
            <option value="ngo">Registered NGO</option>
            <option value="charitable_clinic">Charitable Clinic</option>
          </select>
        </div>
      </Card>

      {/* Organizations Table / Card List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-text-muted">Loading organizations...</p>
        </div>
      ) : data.organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Organizations Found"
          description={`No organizations matching the current status "${activeTab}" and filter criteria.`}
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-hidden rounded-2xl border border-teal-900/10 bg-white shadow-soft">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-text-muted font-bold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Organization</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Contact Person</th>
                  <th className="px-5 py-3.5">Documents</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.organizations.map((item) => (
                  <tr
                    key={item._id}
                    onClick={() => handleOpenDetail(item._id)}
                    className="hover:bg-teal-50/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-text-heading text-sm">{item.name}</p>
                      <p className="text-text-muted text-[11px]">Reg: {item.registrationNumber}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge color="info" className="capitalize text-[10px]">
                        {item.type?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-text-body">
                      {item.city}, {item.state}
                    </td>
                    <td className="px-5 py-4 text-text-body">
                      <p className="font-semibold">{item.contactPerson}</p>
                      <p className="text-text-muted text-[11px]">{item.phone}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                        <FileText size={12} />
                        {item.documents?.length || 0} files
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        color={
                          item.verificationStatus === 'verified'
                            ? 'success'
                            : item.verificationStatus === 'pending'
                            ? 'warning'
                            : 'danger'
                        }
                        className="capitalize"
                      >
                        {item.verificationStatus}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(item._id);
                        }}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="lg:hidden space-y-3">
            {data.organizations.map((item) => (
              <Card
                key={item._id}
                onClick={() => handleOpenDetail(item._id)}
                className="p-5 space-y-3 hover:border-teal-300 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-text-heading">{item.name}</h3>
                    <p className="text-xs text-text-muted">Reg: {item.registrationNumber}</p>
                  </div>
                  <Badge
                    color={
                      item.verificationStatus === 'verified'
                        ? 'success'
                        : item.verificationStatus === 'pending'
                        ? 'warning'
                        : 'danger'
                    }
                    className="capitalize text-[10px]"
                  >
                    {item.verificationStatus}
                  </Badge>
                </div>
                <div className="text-xs text-text-muted flex items-center justify-between pt-2 border-t border-slate-100">
                  <span>{item.city}, {item.state}</span>
                  <span>{item.documents?.length || 0} documents</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs text-text-muted">
                Page {data.page} of {data.totalPages} ({data.total} organizations)
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

      {/* Organization Inspection Side Drawer */}
      <Drawer
        isOpen={Boolean(selectedOrgId)}
        onClose={() => {
          setSelectedOrgId(null);
          setDetailOrg(null);
        }}
        title={detailOrg?.name || 'Organization Inspection'}
        subtitle={detailOrg ? `Category: ${detailOrg.type?.replace('_', ' ').toUpperCase()} • Reg No: ${detailOrg.registrationNumber}` : ''}
        width="max-w-2xl"
      >
        {loadingDetail || !detailOrg ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-text-muted">Loading audit details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Action Bar for Pending Organization */}
            {detailOrg.verificationStatus === 'pending' && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-amber-900">Review Action Required</p>
                  <p className="text-[11px] text-amber-700">Audit submitted credentials against state databases.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setRejectModalOpen(true)}
                    className="flex-1 sm:flex-none"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setVerifyModalOpen(true)}
                    className="flex-1 sm:flex-none"
                  >
                    Verify Organization
                  </Button>
                </div>
              </div>
            )}

            {/* Current Status Badge */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-text-muted font-medium">Verification Status:</span>
              <Badge
                color={
                  detailOrg.verificationStatus === 'verified'
                    ? 'success'
                    : detailOrg.verificationStatus === 'pending'
                    ? 'warning'
                    : 'danger'
                }
                className="capitalize text-xs font-bold"
              >
                {detailOrg.verificationStatus}
              </Badge>
            </div>

            {/* Map Preview */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading">
                Facility Map Coordinates
              </label>
              <div className="h-56 rounded-2xl overflow-hidden border border-slate-200 relative z-10 shadow-inner">
                {detailOrg.location?.coordinates && detailOrg.location.coordinates[0] !== 0 ? (
                  <MapContainer
                    center={[detailOrg.location.coordinates[1], detailOrg.location.coordinates[0]]}
                    zoom={14}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                  >
                    <TileLayer attribution={OSM_ATTRIBUTION} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[detailOrg.location.coordinates[1], detailOrg.location.coordinates[0]]} />
                  </MapContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-text-muted">
                    No map coordinates registered
                  </div>
                )}
              </div>
              <p className="text-[11px] text-text-muted">
                {detailOrg.address}, {detailOrg.city}, {detailOrg.state} - {detailOrg.pincode}
              </p>
            </div>

            {/* Organization Info Grid */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading">
                Profile Information
              </label>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-text-body">
                <p><strong>Contact Person:</strong> {detailOrg.contactPerson}</p>
                <p><strong>Official Email:</strong> {detailOrg.email}</p>
                <p><strong>Official Phone:</strong> {detailOrg.phone}</p>
                <p><strong>Beneficiaries / Month:</strong> {detailOrg.beneficiariesPerMonth || 'N/A'}</p>
                <p><strong>Operating Hours:</strong> {detailOrg.operatingHours || 'N/A'}</p>
                {detailOrg.website && (
                  <p>
                    <strong>Website:</strong>{' '}
                    <a
                      href={detailOrg.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-700 underline font-semibold inline-flex items-center gap-1"
                    >
                      {detailOrg.website}
                      <ExternalLink size={11} />
                    </a>
                  </p>
                )}
                {detailOrg.description && (
                  <p className="pt-2 border-t border-slate-200/80 leading-relaxed">
                    <strong>Mission:</strong> {detailOrg.description}
                  </p>
                )}
              </div>
            </div>

            {/* Uploaded Documents List with in-app viewer */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading">
                Uploaded Verification Documents ({detailOrg.documents?.length || 0})
              </label>

              {(!detailOrg.documents || detailOrg.documents.length === 0) ? (
                <p className="text-xs text-text-muted">No documents uploaded.</p>
              ) : (
                <div className="space-y-2">
                  {detailOrg.documents.map((doc) => (
                    <div
                      key={doc._id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-soft flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                          <FileText size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-heading">{doc.originalName}</p>
                          <p className="text-[10px] text-text-muted capitalize">
                            {doc.type.replace(/_/g, ' ')} • {(doc.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDoc(detailOrg._id, doc._id)}
                      >
                        <Eye size={14} className="mr-1" />
                        View Document
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Review History Timeline */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-text-heading">
                Audit & Review History
              </label>

              {(!detailOrg.reviewHistory || detailOrg.reviewHistory.length === 0) ? (
                <p className="text-xs text-text-muted">No prior reviews recorded.</p>
              ) : (
                <div className="space-y-2">
                  {detailOrg.reviewHistory.map((rev, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <Badge
                          color={rev.decision === 'verified' ? 'success' : 'danger'}
                          className="capitalize text-[10px]"
                        >
                          {rev.decision}
                        </Badge>
                        <span className="text-[10px] text-text-muted">
                          {new Date(rev.at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-text-muted">Reviewer: {rev.reviewerId?.name || 'Admin'}</p>
                      {rev.note && <p className="text-slate-700 font-medium">"{rev.note}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Verify Confirmation Modal */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title="Approve Organization Verification"
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-text-body leading-relaxed">
            Are you sure you want to approve <strong>{detailOrg?.name}</strong>? This will activate their account, grant them NGO dashboard access, send a confirmation email, and list them in the verified public registry.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setVerifyModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={handleConfirmVerify}>
              Confirm Verification
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Confirmation Modal with Required Note */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Organization Verification"
      >
        <div className="space-y-4">
          <p className="text-xs text-text-body leading-relaxed">
            Please provide a specific reason explaining why <strong>{detailOrg?.name}</strong> could not be approved. This feedback will be emailed to the organization so they can rectify their submission.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-text-heading mb-1.5">
              Rejection Reason Note * (Minimum 10 characters)
            </label>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. The uploaded registration certificate is illegible. Please re-upload a clear scanned copy of your 80G certificate..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-text-heading placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <span className="text-[10px] text-text-muted">{rejectReason.length} characters (min 10)</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={actionLoading} onClick={handleConfirmReject}>
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

