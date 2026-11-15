import asyncHandler from '../middleware/asyncHandler.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import storageService from '../services/storage.service.js';
import recordAuditLog from '../services/audit.service.js';
import {
  ORG_STATUS,
  ROLES,
  APPROVAL_STATUS,
  AUDIT_ACTIONS,
  ORG_TYPE,
  ORG_DOC_TYPES,
} from '../config/constants.js';

/**
 * Create a new draft organization profile for the logged-in NGO user.
 * @route POST /api/organizations
 */
export const createOrganization = asyncHandler(async (req, res, next) => {
  const existingOrg = await Organization.findOne({ ownerId: req.user._id });
  if (existingOrg) {
    return next(
      new ApiError(409, 'An organization profile already exists for your account.')
    );
  }

  const {
    name,
    type,
    registrationNumber,
    contactPerson,
    email,
    phone,
    address,
    city,
    state,
    pincode,
    description,
    website,
    servicesOffered,
    beneficiariesPerMonth,
    operatingHours,
    location,
  } = req.body;

  // Convert lat/lng to GeoJSON [longitude, latitude]
  const geoJsonLocation = {
    type: 'Point',
    coordinates: [Number(location.lng), Number(location.lat)],
  };

  const organization = await Organization.create({
    name,
    type,
    registrationNumber,
    contactPerson,
    email: email.toLowerCase(),
    phone,
    address,
    city,
    state,
    pincode,
    description: description || '',
    website: website || '',
    servicesOffered: servicesOffered || [],
    beneficiariesPerMonth: beneficiariesPerMonth || 0,
    operatingHours: operatingHours || '',
    location: geoJsonLocation,
    verificationStatus: ORG_STATUS.DRAFT,
    ownerId: req.user._id,
  });

  // Link organization to user profile
  await User.findByIdAndUpdate(req.user._id, { organizationId: organization._id });

  await recordAuditLog({
    userId: req.user._id,
    action: AUDIT_ACTIONS.ORG_CREATED,
    req,
    meta: { orgId: organization._id, name: organization.name },
  });

  res.status(201).json(
    new ApiResponse(201, { organization }, 'Organization draft created successfully.')
  );
});

/**
 * Get own organization profile with document metadata and review history.
 * @route GET /api/organizations/me
 */
export const getMyOrganization = asyncHandler(async (req, res, next) => {
  const organization = await Organization.findOne({ ownerId: req.user._id }).populate(
    'reviewHistory.reviewerId',
    'name email'
  );

  if (!organization) {
    return next(new ApiError(404, 'No organization profile found for your account.'));
  }

  res.status(200).json(
    new ApiResponse(200, { organization }, 'Organization retrieved successfully.')
  );
});

/**
 * Update own organization profile (only allowed in draft or rejected status).
 * @route PATCH /api/organizations/me
 */
export const updateMyOrganization = asyncHandler(async (req, res, next) => {
  const organization = await Organization.findOne({ ownerId: req.user._id });

  if (!organization) {
    return next(new ApiError(404, 'No organization profile found for your account.'));
  }

  if (
    organization.verificationStatus !== ORG_STATUS.DRAFT &&
    organization.verificationStatus !== ORG_STATUS.REJECTED
  ) {
    return next(
      new ApiError(
        409,
        `Organization details cannot be edited while in "${organization.verificationStatus}" status.`
      )
    );
  }

  const allowedFields = [
    'name',
    'type',
    'registrationNumber',
    'contactPerson',
    'email',
    'phone',
    'address',
    'city',
    'state',
    'pincode',
    'description',
    'website',
    'servicesOffered',
    'beneficiariesPerMonth',
    'operatingHours',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      organization[field] = req.body[field];
    }
  });

  if (req.body.location) {
    organization.location = {
      type: 'Point',
      coordinates: [Number(req.body.location.lng), Number(req.body.location.lat)],
    };
  }

  await organization.save();

  await recordAuditLog({
    userId: req.user._id,
    action: AUDIT_ACTIONS.ORG_UPDATED,
    req,
    meta: { orgId: organization._id },
  });

  res.status(200).json(
    new ApiResponse(200, { organization }, 'Organization updated successfully.')
  );
});

/**
 * Upload a verification document (multipart/form-data).
 * @route POST /api/organizations/me/documents
 */
export const uploadDocument = asyncHandler(async (req, res, next) => {
  const organization = await Organization.findOne({ ownerId: req.user._id });

  if (!organization) {
    return next(new ApiError(404, 'No organization profile found for your account.'));
  }

  if (
    organization.verificationStatus !== ORG_STATUS.DRAFT &&
    organization.verificationStatus !== ORG_STATUS.REJECTED
  ) {
    return next(
      new ApiError(
        409,
        `Documents cannot be uploaded while organization is in "${organization.verificationStatus}" status.`
      )
    );
  }

  if (organization.documents.length >= 6) {
    return next(
      new ApiError(400, 'Maximum limit of 6 documents reached per organization.')
    );
  }

  const { type } = req.body;
  if (!type) {
    return next(new ApiError(400, 'Document type is required.'));
  }

  // Save via isolated storage service
  const storedFileInfo = await storageService.saveFile(organization._id, req.file);

  const newDoc = {
    type,
    originalName: storedFileInfo.originalName,
    storedName: storedFileInfo.storedName,
    mimeType: storedFileInfo.mimeType,
    size: storedFileInfo.size,
    uploadedAt: new Date(),
  };

  organization.documents.push(newDoc);
  await organization.save();

  // Return the newly added document metadata without storedName
  const savedDoc = organization.documents[organization.documents.length - 1].toObject();
  delete savedDoc.storedName;

  await recordAuditLog({
    userId: req.user._id,
    action: AUDIT_ACTIONS.ORG_DOCUMENT_UPLOADED,
    req,
    meta: { orgId: organization._id, docId: savedDoc._id, docType: type },
  });

  res.status(201).json(
    new ApiResponse(
      201,
      { document: savedDoc, totalDocuments: organization.documents.length },
      'Document uploaded successfully.'
    )
  );
});

/**
 * Delete an uploaded verification document.
 * @route DELETE /api/organizations/me/documents/:docId
 */
export const deleteDocument = asyncHandler(async (req, res, next) => {
  const organization = await Organization.findOne({ ownerId: req.user._id }).select(
    '+documents.storedName'
  );

  if (!organization) {
    return next(new ApiError(404, 'No organization profile found for your account.'));
  }

  if (
    organization.verificationStatus !== ORG_STATUS.DRAFT &&
    organization.verificationStatus !== ORG_STATUS.REJECTED
  ) {
    return next(
      new ApiError(
        409,
        `Documents cannot be deleted while organization is in "${organization.verificationStatus}" status.`
      )
    );
  }

  const doc = organization.documents.id(req.params.docId);
  if (!doc) {
    return next(new ApiError(404, 'Document not found.'));
  }

  // Delete from storage
  if (doc.storedName) {
    await storageService.deleteFile(organization._id, doc.storedName);
  }

  // Remove from subdocument array
  organization.documents.pull({ _id: req.params.docId });
  await organization.save();

  await recordAuditLog({
    userId: req.user._id,
    action: AUDIT_ACTIONS.ORG_DOCUMENT_DELETED,
    req,
    meta: { orgId: organization._id, docId: req.params.docId },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      { remainingDocuments: organization.documents.length },
      'Document deleted successfully.'
    )
  );
});

/**
 * Stream an authenticated document file.
 * Allowed ONLY for organization owner or system administrators.
 * @route GET /api/organizations/:orgId/documents/:docId/file
 */
export const streamDocumentFile = asyncHandler(async (req, res, next) => {
  const { orgId, docId } = req.params;

  const organization = await Organization.findById(orgId).select('+documents.storedName');
  if (!organization) {
    return next(new ApiError(404, 'Organization not found.'));
  }

  // Strict RBAC: only owner or admin can stream
  const isOwner = req.user.role === ROLES.NGO && organization.ownerId.equals(req.user._id);
  const isAdmin = req.user.role === ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    return next(
      new ApiError(403, 'You do not have permission to access this document.')
    );
  }

  const doc = organization.documents.id(docId);
  if (!doc) {
    return next(new ApiError(404, 'Document record not found.'));
  }

  if (!storageService.fileExists(organization._id, doc.storedName)) {
    return next(new ApiError(404, 'Physical file not found on storage server.'));
  }

  res.set({
    'Content-Type': doc.mimeType,
    'Content-Disposition': `inline; filename="${encodeURIComponent(doc.originalName)}"`,
    'X-Content-Type-Options': 'nosniff',
  });

  const fileStream = storageService.readFileStream(organization._id, doc.storedName);
  fileStream.on('error', (err) => next(err));
  fileStream.pipe(res);
});

/**
 * Submit organization for administrator verification.
 * Validates all required fields, valid location, and mandatory documents.
 * @route POST /api/organizations/me/submit
 */
export const submitOrganization = asyncHandler(async (req, res, next) => {
  const organization = await Organization.findOne({ ownerId: req.user._id });

  if (!organization) {
    return next(new ApiError(404, 'No organization profile found for your account.'));
  }

  if (
    organization.verificationStatus === ORG_STATUS.PENDING ||
    organization.verificationStatus === ORG_STATUS.VERIFIED
  ) {
    return next(
      new ApiError(
        409,
        `Organization is already in "${organization.verificationStatus}" status.`
      )
    );
  }

  // 1. Validate required fields
  const requiredFields = [
    'name',
    'type',
    'registrationNumber',
    'contactPerson',
    'email',
    'phone',
    'address',
    'city',
    'state',
    'pincode',
  ];

  for (const field of requiredFields) {
    if (!organization[field] || String(organization[field]).trim() === '') {
      return next(
        new ApiError(400, `Organization profile is incomplete. "${field}" is required.`)
      );
    }
  }

  // 2. Validate location coordinates
  const coords = organization.location?.coordinates;
  if (!coords || coords.length !== 2 || (coords[0] === 0 && coords[1] === 0)) {
    return next(
      new ApiError(
        400,
        'A valid map pin location is required before submitting for review.'
      )
    );
  }

  // 3. Validate mandatory documents
  const docTypes = organization.documents.map((d) => d.type);
  const hasRegCert = docTypes.includes(ORG_DOC_TYPES.REGISTRATION_CERTIFICATE);
  const hasIdProof = docTypes.includes(ORG_DOC_TYPES.ID_PROOF);

  if (!hasRegCert || !hasIdProof) {
    return next(
      new ApiError(
        400,
        'Missing required documents: Both a Registration Certificate and an ID Proof must be uploaded.'
      )
    );
  }

  if (organization.type === ORG_TYPE.CHARITABLE_CLINIC) {
    const hasClinicLicense = docTypes.includes(ORG_DOC_TYPES.CLINIC_LICENSE);
    if (!hasClinicLicense) {
      return next(
        new ApiError(
          400,
          'Charitable clinics must upload a valid Clinic / Facility License.'
        )
      );
    }
  }

  // 4. Update status to pending
  organization.verificationStatus = ORG_STATUS.PENDING;
  organization.submittedAt = new Date();
  await organization.save();

  // 5. Update owner approval status to pending
  await User.findByIdAndUpdate(req.user._id, {
    approvalStatus: APPROVAL_STATUS.PENDING,
    approvalNote: null,
  });

  // 6. Notify all administrators
  const admins = await User.find({ role: ROLES.ADMIN });
  if (admins.length > 0) {
    const notifications = admins.map((admin) => ({
      userId: admin._id,
      title: 'New Organization Verification Request',
      message: `${organization.name} (${organization.city}) has submitted verification documents for review.`,
      type: 'verification',
      link: `/admin/organizations?search=${encodeURIComponent(organization.name)}`,
    }));
    await Notification.insertMany(notifications);
  }

  await recordAuditLog({
    userId: req.user._id,
    action: AUDIT_ACTIONS.ORG_SUBMITTED,
    req,
    meta: { orgId: organization._id, name: organization.name },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      { organization },
      'Organization submitted successfully for review. The administrative team will verify your credentials.'
    )
  );
});

export default {
  createOrganization,
  getMyOrganization,
  updateMyOrganization,
  uploadDocument,
  deleteDocument,
  streamDocumentFile,
  submitOrganization,
};
