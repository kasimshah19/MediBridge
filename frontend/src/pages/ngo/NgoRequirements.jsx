import { useState, useEffect } from 'react';
import {
  FilePlus,
  Search,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getMyRequirements,
  createRequirement,
  updateRequirement,
  closeRequirement,
} from '../../api/requirement.api';
import RequirementCard from '../../components/matching/RequirementCard';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

const TABS = [
  { key: 'open', label: 'Open Demands' },
  { key: 'fulfilled', label: 'Fulfilled' },
  { key: 'all', label: 'All Requests' },
];

const UNITS = ['strip', 'bottle', 'tube', 'vial', 'box', 'pack'];
const URGENCIES = [
  { value: 'routine', label: 'Routine (Standard Stock)' },
  { value: 'soon', label: 'Soon (Within 1-2 Weeks)' },
  { value: 'urgent', label: 'Urgent (Immediate Patient Need)' },
];

// Client-side compliance keyword lists for instant feedback
const NON_COMPLIANT_KEYWORDS = [
  {
    type: 'controlled',
    words: ['morphine', 'codeine', 'fentanyl', 'tramadol', 'alprazolam', 'diazepam', 'clonazepam', 'lorazepam', 'methadone', 'ketamine'],
    msg: 'Controlled substances or narcotics are strictly prohibited from donation matching under Indian drug laws.',
  },
  {
    type: 'cold_chain',
    words: ['insulin', 'vaccine', 'vaccin', 'interferon', 'erythropoietin', 'botox', 'adalimumab'],
    msg: 'Cold-chain items requiring 2-8°C refrigerated storage cannot be matched via standard logistics.',
  },
  {
    type: 'injection',
    words: ['injection', 'inj', 'infusion', 'ampoule', 'iv drip'],
    msg: 'Injectable medications and infusions cannot be posted for safety reasons.',
  },
];

export default function NgoRequirements() {
  const [currentTab, setCurrentTab] = useState('open');
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    medicineName: '',
    genericName: '',
    quantityNeeded: 10,
    unit: 'strip',
    urgency: 'routine',
    description: '',
    neededBy: '',
  });
  const [complianceWarning, setComplianceWarning] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit / Close State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeReason, setCloseReason] = useState('');

  useEffect(() => {
    fetchRequirements();
  }, [currentTab]);

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const res = await getMyRequirements({
        status: currentTab === 'all' ? undefined : currentTab,
      });
      setRequirements(res.data?.requirements || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load requirements.');
    } finally {
      setLoading(false);
    }
  };

  // Real-time compliance check on typing
  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, medicineName: val }));
    checkCompliance(val, formData.genericName);
  };

  const handleGenericChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, genericName: val }));
    checkCompliance(formData.medicineName, val);
  };

  const checkCompliance = (medName, genName) => {
    const combined = `${medName || ''} ${genName || ''}`.toLowerCase();
    for (const group of NON_COMPLIANT_KEYWORDS) {
      for (const kw of group.words) {
        if (combined.includes(kw)) {
          setComplianceWarning(group.msg);
          return;
        }
      }
    }
    setComplianceWarning(null);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (complianceWarning) {
      toast.error(complianceWarning);
      return;
    }

    setSubmitting(true);
    try {
      await createRequirement({
        ...formData,
        quantityNeeded: parseInt(formData.quantityNeeded, 10),
        neededBy: formData.neededBy || undefined,
      });
      toast.success('Medicine requirement published successfully!');
      setCreateModalOpen(false);
      fetchRequirements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post requirement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (req) => {
    setSelectedReq(req);
    setFormData({
      medicineName: req.medicineName,
      genericName: req.genericName || '',
      quantityNeeded: req.quantityNeeded,
      unit: req.unit,
      urgency: req.urgency,
      description: req.description || '',
      neededBy: req.neededBy ? req.neededBy.split('T')[0] : '',
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    setSubmitting(true);
    try {
      await updateRequirement(selectedReq._id, {
        quantityNeeded: parseInt(formData.quantityNeeded, 10),
        unit: formData.unit,
        urgency: formData.urgency,
        description: formData.description,
        neededBy: formData.neededBy || undefined,
      });
      toast.success('Requirement updated.');
      setEditModalOpen(false);
      fetchRequirements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update requirement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenClose = (req) => {
    setSelectedReq(req);
    setCloseReason('Supplies fulfilled from local clinic stock');
    setCloseModalOpen(true);
  };

  const handleConfirmClose = async (e) => {
    e.preventDefault();
    if (!selectedReq) return;
    setSubmitting(true);
    try {
      await closeRequirement(selectedReq._id, { reason: closeReason.trim() });
      toast.success('Requirement closed.');
      setCloseModalOpen(false);
      fetchRequirements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close requirement.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = requirements.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.medicineName.toLowerCase().includes(q) ||
      (r.genericName && r.genericName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Clinic Medicine Requirements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Post and track specific medicine demands required by your clinic or outreach camps.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          className="bg-teal-600 hover:bg-teal-700 font-semibold flex items-center gap-2 self-start sm:self-auto"
          onClick={() => {
            setFormData({
              medicineName: '',
              genericName: '',
              quantityNeeded: 10,
              unit: 'strip',
              urgency: 'routine',
              description: '',
              neededBy: '',
            });
            setComplianceWarning(null);
            setCreateModalOpen(true);
          }}
        >
          <FilePlus className="w-4 h-4" />
          <span>Post New Requirement</span>
        </Button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex space-x-1 sm:space-x-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCurrentTab(tab.key)}
              className={`py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition ${
                currentTab === tab.key
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search requirements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Spinner size="lg" />
          <span className="text-xs">Loading requirements...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FilePlus}
          title="No Requirements Posted"
          description={
            currentTab === 'open'
              ? 'You have no open requirements. Publish what medicines your community clinic needs.'
              : 'No matching requirements found.'
          }
          action={
            <Button
              size="sm"
              variant="primary"
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => setCreateModalOpen(true)}
            >
              Post First Requirement
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((req) => (
            <RequirementCard
              key={req._id}
              requirement={req}
              showOrg={false}
              isOwner={true}
              onEdit={handleOpenEdit}
              onClose={handleOpenClose}
            />
          ))}
        </div>
      )}

      {/* Post Requirement Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Post Medicine Requirement"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {complianceWarning && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 flex items-start gap-2.5 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Compliance Warning</strong>
                <span>{complianceWarning}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Medicine Name *
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              placeholder="e.g. Paracetamol 500mg, Amoxicillin..."
              value={formData.medicineName}
              onChange={handleNameChange}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Generic Name (Optional)
            </label>
            <input
              type="text"
              maxLength={80}
              placeholder="e.g. Acetaminophen, Amoxicillin Trihydrate..."
              value={formData.genericName}
              onChange={handleGenericChange}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Quantity Needed *
              </label>
              <input
                type="number"
                required
                min={1}
                max={10000}
                value={formData.quantityNeeded}
                onChange={(e) => setFormData({ ...formData, quantityNeeded: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Unit
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 capitalize"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Urgency
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              >
                {URGENCIES.map((urg) => (
                  <option key={urg.value} value={urg.value}>
                    {urg.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Needed By Date (Optional)
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={formData.neededBy}
                onChange={(e) => setFormData({ ...formData, neededBy: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description / Patient Need
            </label>
            <textarea
              rows={2}
              maxLength={500}
              placeholder="e.g. Free medical camp in Dharavi scheduled next Saturday..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || Boolean(complianceWarning)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {submitting ? 'Publishing...' : 'Publish Requirement'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Requirement"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 font-semibold">{formData.medicineName}</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Quantity Needed
              </label>
              <input
                type="number"
                required
                min={1}
                max={10000}
                value={formData.quantityNeeded}
                onChange={(e) => setFormData({ ...formData, quantityNeeded: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Urgency
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white"
              >
                {URGENCIES.map((urg) => (
                  <option key={urg.value} value={urg.value}>
                    {urg.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Close Modal */}
      <Modal
        isOpen={closeModalOpen}
        onClose={() => setCloseModalOpen(false)}
        title="Close Requirement"
      >
        <form onSubmit={handleConfirmClose} className="space-y-4">
          <p className="text-xs text-slate-600">
            Closing <strong>{selectedReq?.medicineName}</strong> will remove it from matching and discovery queues.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Closing
            </label>
            <input
              type="text"
              maxLength={200}
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCloseModalOpen(false)}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {submitting ? 'Closing...' : 'Close Requirement'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
