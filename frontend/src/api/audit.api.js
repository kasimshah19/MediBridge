import api from './axios';

/**
 * Fetch paginated audit logs with masked IPs
 */
export const getAuditLogs = async (params = {}) => {
  const response = await api.get('/admin/audit', { params });
  return response.data;
};

/**
 * Export audit logs to safe CSV
 */
export const exportAuditCsv = async (params = {}) => {
  const response = await api.get('/admin/audit/export.csv', {
    params,
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `medibridge-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  return { success: true };
};

export default {
  getAuditLogs,
  exportAuditCsv,
};
