import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import CountdownRing from '../common/CountdownRing';
import { RefreshCw, QrCode, ShieldCheck, AlertCircle, Clock } from 'lucide-react';
import { generateHandoverToken } from '../../api/transfer.api';

export const HandoverPassPanel = ({
  transfer,
  initialToken = null,
  initialExpiresAt = null,
  onTokenRefreshed,
}) => {
  const [token, setToken] = useState(initialToken);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt ? new Date(initialExpiresAt) : null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate or refresh token
  const handleRefreshToken = useCallback(async () => {
    if (!transfer?._id || loading) return;
    try {
      setLoading(true);
      setError(null);
      const res = await generateHandoverToken(transfer._id);
      if (res?.data) {
        setToken(res.data.token);
        const exp = new Date(res.data.expiresAt);
        setExpiresAt(exp);
        const diff = Math.max(0, Math.floor((exp.getTime() - Date.now()) / 1000));
        setSecondsLeft(diff);
        if (onTokenRefreshed) onTokenRefreshed(res.data);
      }
    } catch (err) {
      console.error('Failed to generate handover pass token:', err);
      setError(err.response?.data?.message || 'Could not generate handover pass. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [transfer?._id, loading, onTokenRefreshed]);

  // Initial load if no token provided
  useEffect(() => {
    if (!token && transfer?.status === 'scheduled') {
      handleRefreshToken();
    }
  }, [token, transfer?.status, handleRefreshToken]);

  // Timer interval
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000));
      setSecondsLeft(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const isExpired = secondsLeft <= 0;
  const qrPayload = token
    ? `MEDIBRIDGE:HANDOVER:${transfer.transferCode}:${token}`
    : '';

  return (
    <Card className="p-6 border-2 border-teal-600 bg-white shadow-md relative overflow-hidden">
      {/* Decorative top header banner */}
      <div className="bg-teal-700 -mx-6 -mt-6 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-teal-200" />
          <h3 className="font-bold text-base tracking-wide">DIGITAL HANDOVER PASS</h3>
        </div>
        <span className="text-xs bg-teal-800/80 px-2.5 py-1 rounded-full font-mono text-teal-100 border border-teal-500/30">
          {transfer.transferCode}
        </span>
      </div>

      <div className="mt-5 flex flex-col items-center text-center">
        {loading ? (
          <div className="py-16 flex flex-col items-center">
            <Spinner size="lg" className="text-teal-600 mb-3" />
            <p className="text-sm font-medium text-slate-600">Generating secure handover pass...</p>
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <p className="text-sm text-rose-600 mb-4">{error}</p>
            <Button onClick={handleRefreshToken} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {/* QR Code Container */}
            <div className={`p-4 bg-white border-2 rounded-2xl shadow-sm relative transition-opacity ${isExpired ? 'opacity-30 border-slate-300' : 'border-teal-500'}`}>
              {token ? (
                <QRCodeSVG
                  value={qrPayload}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-400 text-xs">
                  No active token
                </div>
              )}

              {isExpired && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 rounded-2xl p-4">
                  <Clock className="w-8 h-8 text-rose-600 mb-1" />
                  <span className="font-bold text-sm text-rose-700">Pass Expired</span>
                  <span className="text-xs text-slate-500">Generate a fresh pass below</span>
                </div>
              )}
            </div>

            {/* Formatted Text Code & Countdown */}
            <div className="mt-5 w-full flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3 px-4">
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Verification Code
                </span>
                <span className="font-mono text-2xl font-black text-slate-800 tracking-widest">
                  {token || '-----'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <CountdownRing secondsLeft={secondsLeft} totalSeconds={900} size={54} />
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-3 max-w-sm">
              Present this pass or give the 10-character code to the verified NGO representative during physical handover. Single-use and valid for 15 minutes.
            </p>

            {/* Refresh / Regenerate Button */}
            <Button
              variant={isExpired ? 'primary' : 'outline'}
              size="sm"
              onClick={handleRefreshToken}
              disabled={loading}
              className="mt-4 w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {isExpired ? 'Generate New Pass' : 'Refresh Pass Code'}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
};

export default HandoverPassPanel;
