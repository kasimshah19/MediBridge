import api from './axios';

/**
 * QR Codes & Printable Labels API
 */
export const getMedicineQr = async (medicineId) => {
  const response = await api.get(`/medicines/${medicineId}/qr`);
  return response.data;
};

export const downloadLabelsPdf = async (donationId) => {
  const response = await api.get(`/donations/${donationId}/labels.pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

export default {
  getMedicineQr,
  downloadLabelsPdf,
};
