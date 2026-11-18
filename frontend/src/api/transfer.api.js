import api from './axios';

/**
 * Transfers API Service
 */
export const getMyTransfers = async (params = {}) => {
  const response = await api.get('/transfers/my', { params });
  return response.data;
};

export const getTransferById = async (id) => {
  const response = await api.get(`/transfers/${id}`);
  return response.data;
};

export const generateHandoverToken = async (id) => {
  const response = await api.post(`/transfers/${id}/handover-token`);
  return response.data;
};

export const lookupHandoverTransfer = async ({ code, token }) => {
  const response = await api.post('/transfers/handover/lookup', { code, token });
  return response.data;
};

export const receiveTransferItems = async (id, { token, items }) => {
  const response = await api.post(`/transfers/${id}/receive`, { token, items });
  return response.data;
};

export const downloadReceiptPdf = async (id) => {
  const response = await api.get(`/transfers/${id}/receipt.pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

export default {
  getMyTransfers,
  getTransferById,
  generateHandoverToken,
  lookupHandoverTransfer,
  receiveTransferItems,
  downloadReceiptPdf,
};
