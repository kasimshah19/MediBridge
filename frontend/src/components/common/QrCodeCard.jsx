import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { ExternalLink, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const QrCodeCard = ({
  medicine,
  verifyUrl,
  showVerifyLink = true,
  className = '',
}) => {
  const medicineId = medicine.medicineId || medicine._id;
  const targetUrl = verifyUrl || `${window.location.origin}/verify/${medicineId}`;

  return (
    <Card className={`p-4 border border-slate-200 bg-white shadow-sm flex flex-col items-center text-center ${className}`}>
      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-inner mb-3">
        <QRCodeSVG
          value={targetUrl}
          size={160}
          level="M"
          includeMargin={false}
          imageSettings={{
            src: '/favicon.ico',
            x: undefined,
            y: undefined,
            height: 24,
            width: 24,
            excavate: true,
          }}
        />
      </div>

      <div className="w-full">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 py-1 px-2.5 rounded-full mb-2">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Verified Package QR</span>
        </div>

        <h4 className="font-bold text-slate-800 text-sm truncate">{medicine.name}</h4>
        <p className="text-xs text-slate-500 font-mono mt-0.5">{medicineId}</p>

        <div className="grid grid-cols-2 gap-2 text-left text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 mt-2.5">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Batch</span>
            <span className="font-medium text-slate-700 truncate block">{medicine.batchNumber || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Expiry</span>
            <span className="font-medium text-slate-700 truncate block">
              {medicine.expiryDate
                ? new Date(medicine.expiryDate).toLocaleDateString('en-IN', {
                    month: 'short',
                    year: 'numeric',
                  })
                : 'N/A'}
            </span>
          </div>
        </div>

        {showVerifyLink && (
          <Link to={`/verify/${medicineId}`} target="_blank" className="mt-3 block">
            <Button variant="outline" size="sm" className="w-full text-xs">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Test Public Verification
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
};

export default QrCodeCard;
