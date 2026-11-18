import React, { useState } from 'react';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { FileText, Download } from 'lucide-react';
import { downloadReceiptPdf } from '../../api/transfer.api';

export const ReceiptButton = ({
  transferId,
  transferCode = '',
  variant = 'secondary',
  size = 'md',
  className = '',
}) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!transferId || downloading) return;
    try {
      setDownloading(true);
      const blob = await downloadReceiptPdf(transferId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `medibridge-receipt-${transferCode || transferId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download receipt PDF:', err);
      alert('Could not download receipt PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={downloading}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      {downloading ? (
        <>
          <Spinner size="sm" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <FileText className="w-4 h-4 text-teal-600" />
          <span>Download Receipt</span>
        </>
      )}
    </Button>
  );
};

export default ReceiptButton;
