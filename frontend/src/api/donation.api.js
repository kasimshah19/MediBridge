import api from './axios.js';

/**
 * Create a new draft donation.
 */
export const createDraftDonation = async (data) => {
  const response = await api.post('/donations', data);
  return response.data;
};

/**
 * Fetch paginated list of donor's donations with status counts and search.
 */
export const getMyDonations = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);
  if (params.page) query.append('page', params.page);
  if (params.limit) query.append('limit', params.limit);

  const response = await api.get(`/donations/my?${query.toString()}`);
  return response.data;
};

/**
 * Get real summary metrics for the donor dashboard.
 */
export const getMyDonationsSummary = async () => {
  const response = await api.get('/donations/my/summary');
  return response.data;
};

/**
 * Fetch full details of a single donation.
 */
export const getDonationById = async (id) => {
  const response = await api.get(`/donations/${id}`);
  return response.data;
};

/**
 * Update a draft donation details and items.
 */
export const updateDraftDonation = async (id, data) => {
  const response = await api.patch(`/donations/${id}`, data);
  return response.data;
};

/**
 * Delete a draft donation and its photos.
 */
export const deleteDraftDonation = async (id) => {
  const response = await api.delete(`/donations/${id}`);
  return response.data;
};

/**
 * Upload a medicine photo with upload progress tracking.
 */
export const uploadItemPhoto = async (donationId, itemId, file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('photo', file);

  const response = await api.post(
    `/donations/${donationId}/items/${itemId}/photos`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    }
  );
  return response.data;
};

/**
 * Delete a medicine photo.
 */
export const deleteItemPhoto = async (donationId, itemId, photoId) => {
  const response = await api.delete(
    `/donations/${donationId}/items/${itemId}/photos/${photoId}`
  );
  return response.data;
};

/**
 * Fetch an authenticated medicine photo as an object blob URL.
 */
export const getItemPhotoBlob = async (donationId, itemId, photoId) => {
  const response = await api.get(
    `/donations/${donationId}/items/${itemId}/photos/${photoId}/file`,
    {
      responseType: 'blob',
    }
  );
  return URL.createObjectURL(response.data);
};

/**
 * Submit a draft donation for automated screening & pharmacist review.
 */
export const submitDonation = async (id, declarations) => {
  const response = await api.post(`/donations/${id}/submit`, { declarations });
  return response.data;
};

/**
 * Cancel a submitted/under_verification donation.
 */
export const cancelDonation = async (id, reason) => {
  const response = await api.post(`/donations/${id}/cancel`, { reason });
  return response.data;
};

/**
 * Submit clarification response for a medicine item requiring more info.
 */
export const respondToClarification = async (donationId, itemId, data) => {
  const response = await api.post(`/donations/${donationId}/items/${itemId}/respond`, data);
  return response.data;
};

/**
 * Find nearby verified organizations for an approved donation.
 */
export const getNearbyOrganizationsForDonation = async (id, params = {}) => {
  const response = await api.get(`/donations/${id}/nearby-organizations`, { params });
  return response.data;
};

export default {
  createDraftDonation,
  getMyDonations,
  getMyDonationsSummary,
  getDonationById,
  updateDraftDonation,
  deleteDraftDonation,
  uploadItemPhoto,
  deleteItemPhoto,
  getItemPhotoBlob,
  submitDonation,
  cancelDonation,
  respondToClarification,
  getNearbyOrganizationsForDonation,
};

