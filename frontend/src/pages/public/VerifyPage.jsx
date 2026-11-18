import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import QrScanner from '../../components/transfer/QrScanner';
import CustodyTimeline from '../../components/custody/CustodyTimeline';
import IntegrityBadge from '../../components/common/IntegrityBadge';
import { verifyMedicinePublic } from '../../api/publicVerify.api';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  QrCode,
  Package,
  Calendar,
  Building,
  CheckCircle,
  ExternalLink,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const VerifyPage = () => {
  const { medicineId: urlMedicineId } = useParams();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('t') || searchParams.get('token') || '';

  const [inputCode, setInputCode] = useState(urlMedicineId || '');
  const [activeCode, setActiveCode] = useState(urlMedicineId || '');
  const [showScanner, setShowScanner] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationData, setVerificationData] = useState(null);

  const handleVerify = async (medId, token = urlToken) => {
    if (!medId?.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const res = await verifyMedicinePublic(medId.trim(), token);
      setVerificationData(res?.data || null);
      setActiveCode(medId.trim());
      setShowScanner(false);
    } catch (err) {
      console.error('Public verification error:', err);
      setError(
        err.response?.data?.message ||
          'Medicine ID was not found in the verified MediBridge registry.'
      );
      setVerificationData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlMedicineId) {
      handleVerify(urlMedicineId, urlToken);
    }
  }, [urlMedicineId, urlToken]);

  const handleScanSuccess = (decodedText) => {
    // If it's a URL like https://.../verify/MED-XXXX?t=YYYY
    if (decodedText.includes('/verify/')) {
      const match = decodedText.match(/\/verify\/([^?]+)(?:\?t=([^&]+))?/);
      if (match) {
        const id = match[1];
        const t = match[2] || '';
        setInputCode(id);
        handleVerify(id, t);
        return;
      }
    }

    const clean = decodedText.trim();
    setInputCode(clean);
    handleVerify(clean, '');
  };

  const medicine = verificationData?.medicine;
  const custody = verificationData?.custody;
  const tokenValid = verificationData?.tokenValid;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Portal Header */}
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Official Medicine Ledger Verification</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            Verify Medicine Authenticity
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Scan the MediBridge QR code on your medicine package or enter the Unique Medicine ID to verify licensed inspection and the immutable chain of custody.
          </p>
        </div>

        {/* Search & Scanner Box */}
        <Card className="p-4 sm:p-6 border border-slate-200 bg-white shadow-sm mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(inputCode);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Enter Medicine ID (e.g. MED-2026-000001)..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 bg-white"
              />
            </div>

            <Button type="submit" variant="primary" disabled={loading || !inputCode.trim()}>
              {loading ? <Spinner size="sm" /> : 'Verify Medicine'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowScanner(!showScanner)}
              className="flex items-center gap-2"
            >
              <QrCode className="w-4 h-4 text-slate-600" />
              <span>{showScanner ? 'Hide Camera' : 'Scan QR'}</span>
            </Button>
          </form>

          {showScanner && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-xs font-bold text-center text-slate-700 uppercase tracking-wider mb-3">
                Scan Medicine Package QR Code
              </h3>
              <QrScanner onScanSuccess={handleScanSuccess} />
            </div>
          )}
        </Card>

        {/* Verification Result */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center">
            <Spinner size="lg" className="text-teal-600 mb-3" />
            <p className="text-sm font-medium text-slate-600">
              Querying immutable custody ledger...
            </p>
          </div>
        )}

        {error && !loading && (
          <Card className="p-8 text-center border-rose-200 bg-rose-50/50 max-w-md mx-auto">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Record Not Recognized</h3>
            <p className="text-xs text-rose-700 mt-1 mb-4">{error}</p>
            <p className="text-[11px] text-slate-500">
              Please verify that you entered the full Medicine ID printed on the label, or scan the official package QR.
            </p>
          </Card>
        )}

        {medicine && !loading && (
          <div className="space-y-6">
            {/* Authenticity Certificate Banner */}
            <div
              className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
                tokenValid
                  ? 'bg-emerald-50/80 border-emerald-300'
                  : 'bg-slate-50 border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    tokenValid
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-700 text-white'
                  }`}
                >
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {tokenValid
                        ? 'Authentic Verified Medicine'
                        : 'MediBridge Registry Record'}
                    </h2>
                    <IntegrityBadge valid={custody?.chainValid ?? true} />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {tokenValid
                      ? 'Cryptographic HMAC security token confirmed genuine. Verified through the MediBridge Trust Protocol.'
                      : 'Public registry details matched. (No dynamic QR security token provided).'}
                  </p>
                </div>
              </div>

              <div className="font-mono text-xs font-bold text-slate-700 bg-white/80 border border-slate-200 px-3 py-1.5 rounded-lg self-start sm:self-auto shrink-0">
                {medicine.medicineId}
              </div>
            </div>

            {/* Medicine Profile & Specifications Card */}
            <Card className="p-6 border border-slate-200 bg-white">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                Pharmaceutical Product Profile
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xl font-bold text-slate-900">{medicine.name}</h4>
                  {medicine.genericName && (
                    <p className="text-sm font-medium text-slate-600 mt-0.5 italic">
                      {medicine.genericName}
                    </p>
                  )}
                  {medicine.manufacturer && (
                    <p className="text-xs text-slate-500 mt-1">
                      Manufacturer: <strong className="text-slate-700">{medicine.manufacturer}</strong>
                    </p>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Current Custody Status:</span>
                    <span className="font-bold text-teal-700 capitalize bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {medicine.status}
                    </span>
                  </div>

                  {medicine.currentHolder?.name && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                      <Building className="w-3.5 h-3.5 text-teal-600" />
                      <span>Held by: <strong className="text-slate-800">{medicine.currentHolder.name}</strong></span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Batch Number
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-sm">
                      {medicine.batchNumber || 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Expiry Date
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {medicine.expiryDate
                        ? new Date(medicine.expiryDate).toLocaleDateString('en-IN', {
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Verified Quantity
                    </span>
                    <span className="font-bold text-slate-800">
                      {medicine.quantity} {medicine.unit}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      QR Passport Issued
                    </span>
                    <span className="font-medium text-slate-700">
                      {medicine.qrIssuedAt
                        ? new Date(medicine.qrIssuedAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Yes'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Complete Immutable Custody Timeline */}
            <Card className="p-6 border border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cryptographic Chain of Custody
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Audit trail from initial donor declaration through licensed pharmacist verification and physical handover.
                  </p>
                </div>
              </div>

              <CustodyTimeline
                events={custody?.events || []}
                chainValid={custody?.chainValid ?? true}
                medicineId={medicine.medicineId}
              />
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default VerifyPage;
