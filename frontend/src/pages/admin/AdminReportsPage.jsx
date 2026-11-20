import { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  FileSpreadsheet,
  Shield,
  Package,
  Pill,
  Truck,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import reportApi from '../../api/report.api';
import Spinner from '../../components/ui/Spinner';

const REPORTS = [
  {
    id: 'platform-summary',
    title: 'Executive Platform Summary',
    description:
      'High-level overview report featuring KPI tables, funnel statistics, clinical rejections, and verified partner tables.',
    icon: FileText,
    formats: ['pdf'],
    badge: 'Executive',
    badgeColor: 'bg-sky-100 text-sky-800',
  },
  {
    id: 'donations',
    title: 'Donations Audit Report',
    description:
      'Detailed log of all medicine donations submitted across cities, total declared items, and verification states.',
    icon: Package,
    formats: ['pdf', 'csv'],
    badge: 'Operational',
    badgeColor: 'bg-teal-100 text-teal-800',
  },
  {
    id: 'verifications',
    title: 'Pharmacist Clinical Verifications',
    description:
      'Complete record of licensed pharmacist decisions (approved, rejected, more info requested) and checklist outcomes.',
    icon: Pill,
    formats: ['pdf', 'csv'],
    badge: 'Clinical',
    badgeColor: 'bg-indigo-100 text-indigo-800',
  },
  {
    id: 'handovers',
    title: 'Physical Handovers & Custody',
    description:
      'Log of scheduled and completed transfers, QR token presentation, physical receipt checks, and receiver organizations.',
    icon: Truck,
    formats: ['pdf', 'csv'],
    badge: 'Custody',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'expiry',
    title: 'Medicine Expiry Risk Report',
    description:
      'Inventory analysis of remaining shelf life, items nearing threshold, and automated expired status transitions.',
    icon: Clock,
    formats: ['pdf', 'csv'],
    badge: 'Inventory',
    badgeColor: 'bg-rose-100 text-rose-800',
  },
  {
    id: 'audit',
    title: 'Security & Administrative Audit Logs',
    description:
      'Immutable log of sensitive administrative actions, user status modifications, login events, and masked IPs.',
    icon: Shield,
    formats: ['csv'],
    badge: 'Compliance',
    badgeColor: 'bg-slate-100 text-slate-800',
  },
];

export default function AdminReportsPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  const [downloading, setDownloading] = useState({});
  const [statusMessage, setStatusMessage] = useState(null);

  const handleDownload = async (type, format) => {
    const key = `${type}-${format}`;
    try {
      setDownloading((prev) => ({ ...prev, [key]: true }));
      setStatusMessage(null);

      const res = await reportApi.downloadReport(type, {
        format,
        from: dateRange.from,
        to: dateRange.to,
      });

      setStatusMessage({
        type: 'success',
        text: `Report "${res.filename}" downloaded successfully.`,
      });
    } catch (err) {
      console.error('Failed to download report:', err);
      setStatusMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to generate report. Please try again.',
      });
    } finally {
      setDownloading((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-teal-600" />
              <span>Compliance & Audit Reports</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Download formal PDF summaries and streamed CSV datasets for regulatory reporting
            </p>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs w-full md:w-auto">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
              className="bg-transparent text-slate-700 outline-none"
            />
            <span className="text-slate-400 font-medium">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
              className="bg-transparent text-slate-700 outline-none"
            />
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {REPORTS.map((rep) => {
          const IconComponent = rep.icon;
          return (
            <div
              key={rep.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                    <IconComponent className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${rep.badgeColor}`}>
                    {rep.badge}
                  </span>
                </div>

                <h2 className="text-base font-bold text-slate-900 mb-1.5">{rep.title}</h2>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">{rep.description}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                {rep.formats.includes('pdf') && (
                  <button
                    onClick={() => handleDownload(rep.id, 'pdf')}
                    disabled={downloading[`${rep.id}-pdf`]}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {downloading[`${rep.id}-pdf`] ? (
                      <Spinner size="sm" />
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF Report</span>
                      </>
                    )}
                  </button>
                )}

                {rep.formats.includes('csv') && (
                  <button
                    onClick={() => handleDownload(rep.id, 'csv')}
                    disabled={downloading[`${rep.id}-csv`]}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    {downloading[`${rep.id}-csv`] ? (
                      <Spinner size="sm" />
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>CSV Export</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Policy and Safety Notice */}
      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-500 space-y-1">
        <div className="font-semibold text-slate-700">Report Generation Limits & Privacy:</div>
        <div>• PDF reports render up to 500 records. For comprehensive exports, use the streaming CSV option.</div>
        <div>• CSV exports stream directly up to 5,000 records with UTF-8 BOM encoding and injection neutralization.</div>
        <div>• Under privacy rules, phone numbers, emails, and exact street coordinates are permanently excluded from export datasets.</div>
      </div>
    </div>
  );
}
