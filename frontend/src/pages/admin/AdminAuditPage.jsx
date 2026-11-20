import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Download,
  Calendar,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import auditApi from '../../api/audit.api';
import { formatDateTimeIST } from '../../utils/format';
import Spinner from '../../components/ui/Spinner';
import Drawer from '../../components/ui/Drawer';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);

  // Detail Drawer
  const [selectedLog, setSelectedLog] = useState(null);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        action: actionFilter || undefined,
        search: searchTerm.trim() || undefined,
      };

      const res = await auditApi.getAuditLogs(params);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [page, actionFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadAuditLogs();
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await auditApi.exportAuditCsv({
        action: actionFilter || undefined,
      });
    } catch (err) {
      console.error('Failed to export audit CSV:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-teal-600" />
              <span>Immutable Audit Trail</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Cryptographically timestamped actions, role overrides, and masked origin IPs
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
            >
              {exporting ? <Spinner size="sm" /> : <Download className="w-3.5 h-3.5" />}
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search action or actor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500 focus:bg-white"
            />
          </form>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none"
          >
            <option value="">All Audit Actions</option>
            <option value="USER_SUSPENDED">USER_SUSPENDED</option>
            <option value="USER_REACTIVATED">USER_REACTIVATED</option>
            <option value="USER_BLOCKED">USER_BLOCKED</option>
            <option value="REPORT_GENERATED">REPORT_GENERATED</option>
            <option value="STORAGE_MIGRATED">STORAGE_MIGRATED</option>
            <option value="ORIGIN_CHECK_FAILED">ORIGIN_CHECK_FAILED</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="EXPIRY_JOB_RUN">EXPIRY_JOB_RUN</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Masked IP</th>
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-4 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 font-sans">
                    <Spinner size="md" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 font-sans">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 font-sans">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-sans">
                      <div>{log.userId?.email || log.actorType || 'system'}</div>
                      {log.userId?.role && (
                        <span className="text-[10px] text-slate-400 capitalize">
                          {log.userId.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs">
                      {log.ip || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-sans">
                      {formatDateTimeIST(log.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                        title="View Audit Metadata"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing page {page} of {totalPages} ({total} entries)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Entry Details"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs font-sans">
            <div>
              <span className="text-slate-400 block text-[11px]">Action</span>
              <span className="font-bold text-slate-900 text-sm">{selectedLog.action}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block text-[11px]">Actor Type</span>
                <span className="font-semibold text-slate-700 capitalize">{selectedLog.actorType || 'system'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Origin IP (Masked)</span>
                <span className="font-mono text-slate-700">{selectedLog.ip || 'N/A'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Recorded Timestamp</span>
              <span className="text-slate-700">{formatDateTimeIST(selectedLog.createdAt)}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Metadata Payload</span>
              <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed">
                {JSON.stringify(selectedLog.meta || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
