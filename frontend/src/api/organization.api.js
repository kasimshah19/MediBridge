import api from './axios.js';

/**
 * Create a new draft organization profile.
 */
export const createOrganization = async (orgData) => {
  const response = await api.post('/organizations', orgData);
  return response.data;
};

/**
 * Get own organization profile.
 */
export const getMyOrganization = async () => {
  const response = await api.get('/organizations/me');
  return response.data;
};

/**
 * Update own organization profile (draft or rejected).
 */
export const updateMyOrganization = async (orgData) => {
  const response = await api.patch('/organizations/me', orgData);
  return response.data;
};

/**
 * Upload a document to own organization profile.
 */
export const uploadDocument = async (formData, onProgress) => {
  const response = await api.post('/organizations/me/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
  return response.data;
};

/**
 * Delete a document from own organization profile.
 */
export const deleteDocument = async (docId) => {
  const response = await api.delete(`/organizations/me/documents/${docId}`);
  return response.data;
};

/**
 * Fetch document binary as Blob for authenticated viewing.
 */
export const getDocumentBlob = async (orgId, docId) => {
  const response = await api.get(`/organizations/${orgId}/documents/${docId}/file`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Submit organization for verification.
 */
export const submitOrganization = async () => {
  const response = await api.post('/organizations/me/submit');
  return response.data;
};

export default {
  createOrganization,
  getMyOrganization,
  updateMyOrganization,
  uploadDocument,
  deleteDocument,
  getDocumentBlob,
  submitOrganization,
};

