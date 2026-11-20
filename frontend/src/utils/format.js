/**
 * Standard Indian digit grouping and date formatting helpers.
 */

export const formatNumberIndian = (num) => {
  if (num === null || num === undefined || isNaN(Number(num))) return '0';
  return Number(num).toLocaleString('en-IN');
};

export const formatPercent = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) return '0%';
  return `${Number(val).toFixed(1)}%`;
};

export const formatDateIST = (dateStr, options = {}) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...options,
    }).format(date);
  } catch {
    return String(dateStr);
  }
};

export const formatDateTimeIST = (dateStr) => {
  return formatDateIST(dateStr, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export default {
  formatNumberIndian,
  formatPercent,
  formatDateIST,
  formatDateTimeIST,
};
