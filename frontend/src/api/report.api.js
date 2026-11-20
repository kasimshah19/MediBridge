import api from './axios';

/**
 * Download admin compliance report as Blob and trigger browser download
 */
export const downloadReport = async (type, { format = 'csv', from, to } = {}) => {
  const response = await api.get(`/admin/reports/${type}`, {
    params: { format, from, to },
    responseType: 'blob',
  });

  const blob = new Blob([response.data], {
    type: format === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8',
  });

  // Extract filename from header or construct default
  let filename = `medibridge-${type}.${format}`;
  const disposition = response.headers['content-disposition'];
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  return { success: true, filename };
};

export default {
  downloadReport,
};
