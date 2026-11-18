import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import TransferStatusBadge from '../../components/common/TransferStatusBadge';
import { getMyTransfers } from '../../api/transfer.api';
import { Package, Clock, ArrowRight, QrCode, CheckCircle, Search } from 'lucide-react';

export const DonorHandoversPage = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const res = await getMyTransfers({
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setTransfers(res?.data?.transfers || []);
    } catch (err) {
      console.error('Failed to fetch donor transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [statusFilter]);

  const filteredTransfers = transfers.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.transferCode?.toLowerCase().includes(term) ||
      t.donationId?.donationCode?.toLowerCase().includes(term) ||
      t.organizationId?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medicine Handovers</h1>
            <p className="text-sm text-slate-500 mt-1">
              Track physical redistribution handovers, access your digital passes, and download finalized receipts.
            </p>
          </div>
        </div>

        {/* Status Tabs & Search Filter */}
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

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by code or NGO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 bg-white"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Spinner size="lg" className="text-teal-600 mb-3" />
            <p className="text-sm font-medium text-slate-500">Loading handovers...</p>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No handovers found"
            description={
              statusFilter === 'all'
                ? 'When an NGO accepts your donation match, scheduled handovers will appear here.'
                : `No handovers in '${statusFilter.replace(/_/g, ' ')}' status.`
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTransfers.map((transfer) => {
              const isScheduled = ['scheduled', 'partially_completed'].includes(transfer.status);
              const itemCount = transfer.items?.length || 0;
              const completedCount = transfer.items?.filter((i) => i.status === 'received').length || 0;

              return (
                <Card
                  key={transfer._id}
                  className="p-5 border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {transfer.transferCode}
                      </span>
                      <TransferStatusBadge status={transfer.status} />
                    </div>

                    <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                      {transfer.organizationId?.name || 'Verified Organization'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {transfer.organizationId?.city}, {transfer.organizationId?.state}
                    </p>

                    <div className="my-4 py-2.5 px-3 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Donation Code:</span>
                        <strong className="text-slate-800 font-mono">
                          {transfer.donationId?.donationCode || 'DON-VERIFIED'}
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Items:</span>
                        <strong className="text-slate-800">
                          {completedCount > 0 ? `${completedCount} of ${itemCount} received` : `${itemCount} medicines`}
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Scheduled:</span>
                        <span>{new Date(transfer.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  <Link to={`/donor/handovers/${transfer._id}`} className="mt-2 block">
                    <Button
                      variant={isScheduled ? 'primary' : 'outline'}
                      size="sm"
                      className="w-full flex items-center justify-center gap-1.5 text-xs"
                    >
                      {isScheduled ? (
                        <>
                          <QrCode className="w-3.5 h-3.5" />
                          <span>View Handover Pass</span>
                        </>
                      ) : (
                        <>
                          <span>View Details & Receipt</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </Button>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
  );
};

export default DonorHandoversPage;
