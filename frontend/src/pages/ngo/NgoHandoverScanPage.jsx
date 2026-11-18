import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import QrScanner from '../../components/transfer/QrScanner';
import ManualCodeInput from '../../components/common/ManualCodeInput';
import ItemReceiveCard from '../../components/transfer/ItemReceiveCard';
import ReceiptButton from '../../components/common/ReceiptButton';
import { lookupHandoverTransfer, receiveTransferItems } from '../../api/transfer.api';
import {
  QrCode,
  Keyboard,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Package,
  FileText,
} from 'lucide-react';

export const NgoHandoverScanPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Mode: 'scan' | 'manual'
  const [inputMode, setInputMode] = useState('scan');
  const [transferCode, setTransferCode] = useState(searchParams.get('code') || '');
  const [tokenInput, setTokenInput] = useState('');

  // Flow step: 1 = lookup, 2 = inspect/verify, 3 = success
  const [step, setStep] = useState(1);
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const [matchedTransfer, setMatchedTransfer] = useState(null);
  const [verifiedToken, setVerifiedToken] = useState('');
  const [itemsDecisions, setItemsDecisions] = useState({});
  const [completedTransfer, setCompletedTransfer] = useState(null);

  // Initialize decisions when transfer is loaded
  const initDecisions = (transfer) => {
    const initial = {};
    (transfer.items || []).forEach((item) => {
      initial[item.medicineId] = {
        medicineId: item.medicineId,
        decision: item.status === 'received' ? 'received' : 'received',
        checklist: {
          packagingIntact: false,
          batchMatches: false,
          expiryMatches: false,
          quantityMatches: false,
        },
        receivedQuantity: item.snapshot?.quantity || 1,
        labelToken: '',
        reasonCode: '',
        note: '',
      };
    });
    setItemsDecisions(initial);
  };

  // Process lookup
  const handlePerformLookup = async (code, token) => {
    if (!token) {
      setLookupError('Please enter or scan the 10-character handover token.');
      return;
    }

    try {
      setLookingUp(true);
      setLookupError(null);
      const res = await lookupHandoverTransfer({
        code: code?.trim() || undefined,
        token: token.trim(),
      });

      if (res?.data) {
        setMatchedTransfer(res.data);
        setVerifiedToken(token.trim());
        initDecisions(res.data);
        setStep(2);
      }
    } catch (err) {
      console.error('Handover lookup failed:', err);
      setLookupError(
        err.response?.data?.message || 'Invalid or expired handover token. Please verify with the donor.'
      );
    } finally {
      setLookingUp(false);
    }
  };

  // QR Scan callback
  const handleScanSuccess = (decodedText) => {
    if (!decodedText || lookingUp) return;

    // Check if encoded as MEDIBRIDGE:HANDOVER:<code?>:<token>
    if (decodedText.startsWith('MEDIBRIDGE:HANDOVER:')) {
      const parts = decodedText.split(':');
      if (parts.length >= 4) {
        const c = parts[2];
        const t = parts[3];
        setTransferCode(c);
        setTokenInput(t);
        handlePerformLookup(c, t);
        return;
      }
    }

    // Direct token or transfer code
    const clean = decodedText.trim();
    if (clean.length === 11 && clean.includes('-')) {
      setTokenInput(clean);
      handlePerformLookup(transferCode, clean);
    } else {
      setTokenInput(clean);
    }
  };

  // Handle item decision changes
  const handleItemChange = (medicineId, updated) => {
    setItemsDecisions((prev) => ({
      ...prev,
      [medicineId]: updated,
    }));
  };

  // Finalize receipt
  const handleSubmitReceipt = async () => {
    if (!matchedTransfer?._id || submitting) return;

    // Validate that all received items have passed checklist
    const submissions = Object.values(itemsDecisions);
    for (const sub of submissions) {
      if (sub.decision === 'received') {
        const c = sub.checklist || {};
        if (!c.packagingIntact || !c.batchMatches || !c.expiryMatches || !c.quantityMatches) {
          setSubmitError('All 4 physical verification checklist items must be checked for every received medicine.');
          return;
        }
        if (!sub.receivedQuantity || sub.receivedQuantity <= 0) {
          setSubmitError('Please enter a valid received quantity for all accepted medicines.');
          return;
        }
      } else if (sub.decision === 'rejected') {
        if (!sub.reasonCode) {
          setSubmitError('Please select a rejection reason code for every rejected medicine.');
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      const res = await receiveTransferItems(matchedTransfer._id, {
        token: verifiedToken,
        items: submissions,
      });

      if (res?.data) {
        setCompletedTransfer(res.data);
        setStep(3);
      }
    } catch (err) {
      console.error('Failed to receive transfer items:', err);
      setSubmitError(
        err.response?.data?.message || 'Failed to finalize handover receipt. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              to="/ngo/handovers"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Handovers</span>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Physical Handover Verification</h1>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 1 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              1
            </span>
            <div className="w-6 h-0.5 bg-slate-200" />
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 2 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <div className="w-6 h-0.5 bg-slate-200" />
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 3 ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
          </div>
        </div>

        {/* STEP 1: SCAN OR INPUT TOKEN */}
        {step === 1 && (
          <Card className="p-6 border border-slate-200 bg-white">
            <div className="text-center max-w-md mx-auto mb-6">
              <h2 className="text-lg font-bold text-slate-800">Scan Donor Handover Pass</h2>
              <p className="text-xs text-slate-500 mt-1">
                Scan the QR code displayed on the donor's mobile screen or enter the 10-character verification pass code.
              </p>

              {/* Mode Toggle */}
              <div className="mt-4 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setInputMode('scan')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                    inputMode === 'scan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Camera Scanner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('manual')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                    inputMode === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Manual Code</span>
                </button>
              </div>
            </div>

            {lookupError && (
              <div className="max-w-md mx-auto mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}

            {inputMode === 'scan' ? (
              <QrScanner onScanSuccess={handleScanSuccess} />
            ) : (
              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transfer Code (Optional if single match)
                  </label>
                  <input
                    type="text"
                    placeholder="TRF-2026-000001"
                    value={transferCode}
                    onChange={(e) => setTransferCode(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    10-Character Handover Pass Code *
                  </label>
                  <ManualCodeInput
                    value={tokenInput}
                    onChange={setTokenInput}
                    onEnter={() => handlePerformLookup(transferCode, tokenInput)}
                  />
                </div>

                <Button
                  variant="primary"
                  className="w-full mt-2"
                  onClick={() => handlePerformLookup(transferCode, tokenInput)}
                  disabled={lookingUp || !tokenInput}
                >
                  {lookingUp ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      <span>Verifying Pass...</span>
                    </>
                  ) : (
                    <span>Verify Handover Pass</span>
                  )}
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* STEP 2: INSPECT ITEMS & CHECKLIST */}
        {step === 2 && matchedTransfer && (
          <div className="space-y-6">
            {/* Transfer Summary Header Card */}
            <Card className="p-5 border-2 border-teal-500 bg-teal-50/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-300">
                      {matchedTransfer.transferCode}
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Pass Verified
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mt-2">
                    Donor: {matchedTransfer.donor?.displayName || 'Verified Donor'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Pickup Location: {matchedTransfer.donationId?.pickupAddress || 'Address on file'}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="text-xs self-start sm:self-auto"
                >
                  Scan Different Pass
                </Button>
              </div>
            </Card>

            {submitError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Items Inspection List */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base">
                Physical Inspection & Receipt Manifest ({matchedTransfer.items?.length || 0} items)
              </h3>

              {matchedTransfer.items?.map((item) => (
                <ItemReceiveCard
                  key={item.medicineId}
                  item={item}
                  value={itemsDecisions[item.medicineId] || {}}
                  onChange={(updated) => handleItemChange(item.medicineId, updated)}
                />
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-xs text-slate-500">
                Confirming physical receipt permanently updates the SHA-256 chain of custody and issues an official handover receipt.
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleSubmitReceipt}
                disabled={submitting}
                className="w-full sm:w-auto shrink-0 shadow-md"
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    <span>Sealing Ledger & Receiving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    <span>Confirm Physical Receipt</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS & RECEIPT */}
        {step === 3 && completedTransfer && (
          <Card className="p-8 border border-slate-200 bg-white text-center max-w-lg mx-auto shadow-md">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900">Handover Finalized!</h2>
            <p className="text-sm text-slate-600 mt-2 mb-6">
              Transfer <strong className="font-mono text-slate-800">{completedTransfer.transferCode}</strong> has been successfully received and cryptographically sealed into the MediBridge chain of custody.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 mb-6 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-700 capitalize">{completedTransfer.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Items Received:</span>
                <span className="font-bold text-slate-800">
                  {completedTransfer.items?.filter((i) => i.status === 'received').length || 0} medicines
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ledger Hash Sealed:</span>
                <span className="font-mono text-teal-700 font-bold">SHA-256 VERIFIED</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <ReceiptButton
                transferId={completedTransfer._id}
                transferCode={completedTransfer.transferCode}
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
              />

              <Link to="/ngo/handovers" className="w-full sm:w-auto">
                <Button variant="outline" size="md" className="w-full">
                  Back to Handovers
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
  );
};

export default NgoHandoverScanPage;
