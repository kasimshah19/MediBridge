import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import TransferStatusBadge from '../../components/common/TransferStatusBadge';
import ReceiptButton from '../../components/common/ReceiptButton';
import HandoverPassPanel from '../../components/transfer/HandoverPassPanel';
import { getTransferById } from '../../api/transfer.api';
import {
  ArrowLeft,
  Building,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Phone,
  Mail,
  ShieldCheck,
} from 'lucide-react';

export const DonorHandoverDetailPage = () => {
  const { id } = useParams();
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransfer = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getTransferById(id);
      setTransfer(res?.data || null);
    } catch (err) {
      console.error('Failed to fetch transfer:', err);
      setError(err.response?.data?.message || 'Handover record not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfer();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Spinner size="lg" className="text-teal-600 mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading handover details...</p>
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Handover Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">{error || 'This handover record could not be loaded.'}</p>
        <Link to="/donor/handovers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Handovers
          </Button>
        </Link>
      </div>
    );
  }

  const isScheduled = ['scheduled', 'partially_completed'].includes(transfer.status);
  const isCompleted = transfer.status === 'completed';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
        {/* Back Link & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              to="/donor/handovers"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Handovers</span>
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {transfer.transferCode}
              </h1>
              <TransferStatusBadge status={transfer.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Created on {new Date(transfer.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST
            </p>
          </div>

          {(isCompleted || transfer.status === 'partially_completed') && (
            <ReceiptButton
              transferId={transfer._id}
              transferCode={transfer.transferCode}
              variant="primary"
            />
          )}
        </div>

        {/* Digital Handover Pass Section (for active scheduled handovers) */}
        {isScheduled && (
          <div className="max-w-md mx-auto">
            <HandoverPassPanel
              transfer={transfer}
              onTokenRefreshed={() => {}}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Receiving Organization Info */}
          <Card className="p-5 border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-800 uppercase tracking-wider mb-3">
              <Building className="w-4 h-4 text-teal-600" />
              <span>Receiving NGO Entity</span>
            </div>

            <h3 className="font-bold text-slate-900 text-base">
              {transfer.organizationId?.name || 'Authorized NGO'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">
              {transfer.organizationId?.type?.replace(/_/g, ' ')}
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {transfer.organizationId?.address}, {transfer.organizationId?.city},{' '}
                  {transfer.organizationId?.state} - {transfer.organizationId?.pincode}
                </span>
              </div>
              {transfer.organizationId?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{transfer.organizationId.phone}</span>
                </div>
              )}
              {transfer.organizationId?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{transfer.organizationId.email}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Pickup & Match Reference */}
          <Card className="p-5 border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              <Package className="w-4 h-4 text-slate-500" />
              <span>Donation & Pickup Details</span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Donation Reference:</span>
                <Link
                  to={`/donor/donations/${transfer.donationId?._id}`}
                  className="font-mono font-bold text-teal-600 hover:underline"
                >
                  {transfer.donationId?.donationCode || 'View Donation'}
                </Link>
              </div>

              {transfer.claimId?.claimCode && (
                <div className="flex justify-between">
                  <span>Match Claim Code:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {transfer.claimId.claimCode}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Pickup Address:</span>
                <span className="text-right text-slate-800 font-medium max-w-[200px]">
                  {transfer.donationId?.pickupAddress || 'Address on file'}
                </span>
              </div>

              {transfer.completedAt && (
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span>Completed At:</span>
                  <span className="text-slate-800 font-medium">
                    {new Date(transfer.completedAt).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}{' '}
                    IST
                  </span>
                </div>
              )}

              {transfer.cancelReason && (
                <div className="pt-2 border-t border-slate-100 text-rose-700">
                  <span className="font-semibold block">Cancellation Reason:</span>
                  <p className="mt-0.5">{transfer.cancelReason}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Handover Items Manifest Table */}
        <Card className="p-5 border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base">Handover Items Manifest</h3>
            <span className="text-xs text-slate-500">
              {transfer.items?.length || 0} item{transfer.items?.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Medicine</th>
                  <th className="py-2.5 px-3">Batch</th>
                  <th className="py-2.5 px-3">Expiry</th>
                  <th className="py-2.5 px-3 text-right">Offered Qty</th>
                  <th className="py-2.5 px-3 text-right">Received Qty</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfer.items?.map((item, idx) => {
                  const snap = item.snapshot || {};
                  const isReceived = item.status === 'received';
                  const isRejected = item.status === 'rejected';

                  return (
                    <tr key={item._id || idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-medium text-slate-900">
                        <div>{snap.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{item.medicineCode}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{snap.batchNumber}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {snap.expiryDate
                          ? new Date(snap.expiryDate).toLocaleDateString('en-IN', {
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-700 font-medium">
                        {snap.quantity} {snap.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800">
                        {item.receivedQuantity ? `${item.receivedQuantity} ${snap.unit}` : '-'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            isReceived
                              ? 'bg-emerald-50 text-emerald-700'
                              : isRejected
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isReceived && <CheckCircle className="w-3 h-3" />}
                          {isRejected && <XCircle className="w-3 h-3" />}
                          {!isReceived && !isRejected && <Clock className="w-3 h-3" />}
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {item.labelVerified ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>QR Verified</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Manual Check</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
  );
};

export default DonorHandoverDetailPage;
