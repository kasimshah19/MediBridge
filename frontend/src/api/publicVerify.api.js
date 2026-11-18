import api from './axios';

/**
 * Public Medicine Verification API
 */
export const verifyMedicinePublic = async (medicineId, token = '') => {
  const params = {};
  if (token) {
    params.t = token;
  }
  const response = await api.get(`/public/verify/${medicineId}`, { params });
  return response.data;
};

export default {
  verifyMedicinePublic,
};
