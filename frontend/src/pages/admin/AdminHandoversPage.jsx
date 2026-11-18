import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Drawer from '../../components/ui/Drawer';
import EmptyState from '../../components/ui/EmptyState';
import TransferStatusBadge from '../../components/common/TransferStatusBadge';
import IntegrityBadge from '../../components/common/IntegrityBadge';
import ReceiptButton from '../../components/common/ReceiptButton';
import CustodyTimeline from '../../components/custody/CustodyTimeline';
import {
  getAdminTransfers,
  getAdminTransfersSummary,
  getAdminCustodyTrace,
  verifyAllCustodyChains,
} from '../../api/admin.api';
import {
  Package,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  Hash,
} from 'lucide-react';

export const AdminHandoversPage = () => {
  const [activeTab, setActiveTab] = useState('transfers'); // 'transfers' | 'audit'

  // Summary state
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Transfers state
  const [transfers, setTransfers] = useState([]);
  const [transfersLoading, setTransfersLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // Audit state
  const [verifyingLedger, setVerifyingLedger] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [custodyTraceLoading, setCustodyTraceLoading] = useState(false);
  const [selectedMedicineTrace, setSelectedMedicineTrace] = useState(null);

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await getAdminTransfersSummary();
      setSummary(res?.data || null);
    } catch (err) {
      console.error('Failed to load transfers summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchTransfers = async () => {
    try {
      setTransfersLoading(true);
      const res = await getAdminTransfers({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
      setTransfers(res?.data?.transfers || []);
    } catch (err) {
      console.error('Failed to load admin transfers:', err);
    } finally {
      setTransfersLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'transfers') {
      fetchTransfers();
    }
  }, [activeTab, statusFilter]);

  const handleRunVerificationCheck = async () => {
    try {
      setVerifyingLedger(true);
      const res = await verifyAllCustodyChains();
      setVerificationResult(res?.data || null);
    } catch (err) {
      console.error('Failed to verify custody chains:', err);
    } finally {
      setVerifyingLedger(false);
    }
  };

  const handleOpenCustodyTrace = async (medicineId) => {
    try {
      setCustodyTraceLoading(true);
      setSelectedMedicineTrace(null);
      const res = await getAdminCustodyTrace(medicineId);
      setSelectedMedicineTrace(res?.data || null);
    } catch (err) {
      console.error('Failed to load custody trace:', err);
    } finally {
      setCustodyTraceLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Handovers & Custody Audit</h1>
            <p className="text-sm text-slate-500 mt-1">
              Oversee physical medicine handovers, inspect manifests, and audit cryptographic hash chains.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'transfers' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('transfers')}
              className="text-xs"
            >
              <Package className="w-3.5 h-3.5 mr-1.5" />
              <span>Transfers</span>
            </Button>
            <Button
              variant={activeTab === 'audit' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('audit')}
              className="text-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              <span>Custody Audit</span>
            </Button>
          </div>
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4 border border-slate-200 bg-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Transfers
            </span>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {summary?.total ?? '-'}
            </div>
          </Card>

          <Card className="p-4 border border-slate-200 bg-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 block">
              Scheduled
            </span>
            <div className="text-2xl font-black text-teal-700 mt-1">
              {summary?.scheduled ?? '-'}
            </div>
          </Card>

          <Card className="p-4 border border-slate-200 bg-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
              Completed
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {summary?.completed ?? '-'}
            </div>
          </Card>

          <Card className="p-4 border border-slate-200 bg-white">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 block">
              Meds Transferred
            </span>
            <div className="text-2xl font-black text-purple-700 mt-1">
              {summary?.medicinesTransferred ?? '-'}
            </div>
          </Card>
        </div>

        {/* TAB 1: ALL TRANSFERS */}
        {activeTab === 'transfers' && (
          <div className="space-y-4">
            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {['all', 'scheduled', 'partially_completed', 'completed', 'cancelled'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                      statusFilter === tab
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchTransfers();
                }}
                className="relative w-full sm:w-72"
              >
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search code, NGO, donor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 bg-white"
                />
              </form>
            </div>

            {/* Transfers Table */}
            <Card className="border border-slate-200 bg-white overflow-hidden shadow-xs">
              {transfersLoading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <Spinner size="lg" className="text-teal-600 mb-3" />
                  <p className="text-sm font-medium text-slate-500">Loading transfers...</p>
                </div>
              ) : transfers.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No transfers found"
                  description="No transfers matched the current filter criteria."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Transfer Code</th>
                        <th className="py-3 px-4">Receiving NGO</th>
                        <th className="py-3 px-4">Donor</th>
                        <th className="py-3 px-4 text-center">Items</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Created</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transfers.map((tr) => (
                        <tr key={tr._id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-teal-800">
                            {tr.transferCode}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{tr.organizationId?.name || 'NGO'}</div>
                            <div className="text-[11px] text-slate-400">{tr.organizationId?.city}, {tr.organizationId?.state}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            {tr.donorId?.name || 'Donor'}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">
                            {tr.items?.length || 0}
                          </td>
                          <td className="py-3 px-4">
                            <TransferStatusBadge status={tr.status} />
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {new Date(tr.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTransfer(tr)}
                              className="text-xs"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              <span>Manifest</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 2: CUSTODY AUDIT */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            {/* Audit Trigger Box */}
            <Card className="p-6 border border-slate-200 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cryptographic Hash Chain Verification Suite
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xl">
                    Verifies continuous 1-based sequencing, genesis hashes, and recomputed SHA-256 links across all medicine custody records in the database.
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={handleRunVerificationCheck}
                  disabled={verifyingLedger}
                  className="shrink-0"
                >
                  {verifyingLedger ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      <span>Verifying Cryptographic Ledger...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      <span>Run Full Ledger Integrity Audit</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Verification Result Banner */}
              {verificationResult && (
                <div
                  className={`mt-5 p-4 rounded-xl border text-xs flex items-start gap-3 ${
                    verificationResult.brokenChainsCount === 0
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-rose-50 border-rose-300 text-rose-800'
                  }`}
                >
                  {verificationResult.brokenChainsCount === 0 ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">
                      {verificationResult.brokenChainsCount === 0
                        ? 'All Chains Verified Intact'
                        : `Compromised Chains Detected (${verificationResult.brokenChainsCount})`}
                    </h4>
                    <p className="mt-0.5">
                      Scanned {verificationResult.totalChains} medicine custody chains.{' '}
                      {verificationResult.validChains} valid, {verificationResult.brokenChainsCount} broken.
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Quick Medicine Trace Lookup */}
            <Card className="p-5 border border-slate-200 bg-white">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Inspect Specific Medicine Chain
              </h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = e.target.medId.value.trim();
                  if (val) handleOpenCustodyTrace(val);
                }}
                className="flex gap-2 max-w-md"
              >
                <input
                  name="medId"
                  type="text"
                  placeholder="Enter Medicine ID (e.g. MED-2026-000001)..."
                  className="flex-1 text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 bg-white"
                />
                <Button type="submit" size="sm" variant="primary">
                  Inspect Trace
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* Transfer Manifest Drawer */}
        <Drawer
          isOpen={!!selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
          title={`Transfer Manifest - ${selectedTransfer?.transferCode || ''}`}
        >
          {selectedTransfer && (
            <div className="space-y-6 text-xs text-slate-700">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">
                    {selectedTransfer.organizationId?.name}
                  </span>
                  <span className="text-slate-500">
                    Donor: {selectedTransfer.donorId?.name} ({selectedTransfer.donorId?.email})
                  </span>
                </div>
                <TransferStatusBadge status={selectedTransfer.status} />
              </div>

              {/* Items List */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-3">Items ({selectedTransfer.items?.length || 0})</h4>
                <div className="space-y-3">
                  {selectedTransfer.items?.map((it, idx) => (
                    <div
                      key={it._id || idx}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{it.snapshot?.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {it.medicineCode} • Batch: {it.snapshot?.batchNumber}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-1">
                          Offered: {it.snapshot?.quantity} {it.snapshot?.unit} | Received: {it.receivedQuantity ? `${it.receivedQuantity} ${it.snapshot?.unit}` : '-'}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${it.status === 'received' ? 'bg-emerald-100 text-emerald-800' : it.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'}`}>
                          {it.status}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenCustodyTrace(it.medicineId)}
                          className="text-[10px] h-6 px-1.5 text-teal-700 hover:text-teal-800"
                        >
                          Trace
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Receipt Action */}
              <div className="pt-4 border-t border-slate-200">
                <ReceiptButton
                  transferId={selectedTransfer._id}
                  transferCode={selectedTransfer.transferCode}
                  variant="primary"
                  size="md"
                  className="w-full"
                />
              </div>
            </div>
          )}
        </Drawer>

        {/* Medicine Custody Trace Drawer */}
        <Drawer
          isOpen={!!selectedMedicineTrace || custodyTraceLoading}
          onClose={() => setSelectedMedicineTrace(null)}
          title="Medicine Custody Trace"
        >
          {custodyTraceLoading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Spinner size="lg" className="text-teal-600 mb-2" />
              <p className="text-xs text-slate-500">Loading immutable trace...</p>
            </div>
          ) : selectedMedicineTrace ? (
            <div className="space-y-4">
              <CustodyTimeline
                events={selectedMedicineTrace.events || []}
                chainValid={selectedMedicineTrace.chainValid ?? true}
                medicineId={selectedMedicineTrace.medicineId}
              />
            </div>
          ) : null}
        </Drawer>
      </div>
  );
};

export default AdminHandoversPage;
