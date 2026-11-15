import { Router } from 'express';
import {
  createOrganization,
  getMyOrganization,
  updateMyOrganization,
  uploadDocument,
  deleteDocument,
  streamDocumentFile,
  submitOrganization,
} from '../controllers/organization.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { uploadDocumentMiddleware } from '../middleware/upload.middleware.js';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  uploadDocumentSchema,
} from '../validators/organization.validator.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Stream document file (protected: owner NGO or Admin)
router.get('/:orgId/documents/:docId/file', protect, streamDocumentFile);

// All subsequent routes require NGO role
router.use(protect, authorizeRoles(ROLES.NGO));

router.post('/', validate(createOrganizationSchema), createOrganization);
router.get('/me', getMyOrganization);
router.patch('/me', validate(updateOrganizationSchema), updateMyOrganization);
router.post(
  '/me/documents',
  uploadDocumentMiddleware('file'),
  validate(uploadDocumentSchema),
  uploadDocument
);
router.delete('/me/documents/:docId', deleteDocument);
router.post('/me/submit', submitOrganization);

export default router;
