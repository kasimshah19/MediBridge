import api from './axios';

/**
 * Custody Ledger & Trace API
 */
export const getMedicineCustody = async (medicineId) => {
  const response = await api.get(`/custody/medicines/${medicineId}`);
  return response.data;
};

export const getDonationCustody = async (donationId) => {
  const response = await api.get(`/custody/donations/${donationId}`);
  return response.data;
};

export default {
  getMedicineCustody,
  getDonationCustody,
};
