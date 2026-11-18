import asyncHandler from '../middleware/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import Request from '../models/Request.js';
import {
  REQUEST_STATUS,
  AUDIT_ACTIONS,
  ROLES,
  MAX_OPEN_REQUIREMENTS_PER_ORG,
} from '../config/constants.js';
import { recordAuditLog } from '../services/audit.service.js';

/**
 * Create a new medicine requirement for an NGO organization.
 * @route POST /api/requirements
 */
export const createRequirement = asyncHandler(async (req, res) => {
  const org = req.organization;

  // Check open requirement limit
  const openCount = await Request.countDocuments({
    organizationId: org._id,
    status: REQUEST_STATUS.OPEN,
  });

  if (openCount >= MAX_OPEN_REQUIREMENTS_PER_ORG) {
    throw new ApiError(
      400,
      `Your organization already has ${openCount} open requirements. Maximum allowed is ${MAX_OPEN_REQUIREMENTS_PER_ORG}.`
    );
  }

  const {
    medicineName,
    genericName,
    quantityNeeded,
    unit,
    urgency,
    description,
    neededBy,
  } = req.body;

  const requirement = await Request.create({
    organizationId: org._id,
    requestedBy: req.user._id,
    medicineName,
    genericName: genericName || '',
    quantityNeeded,
    unit,
    urgency,
    description: description || '',
    neededBy: neededBy || null,
    status: REQUEST_STATUS.OPEN,
    statusHistory: [
      {
        status: REQUEST_STATUS.OPEN,
        note: 'Requirement published',
        at: new Date(),
        by: req.user._id,
      },
    ],
  });

  await recordAuditLog({
    userId: req.user._id,
    action: AUDIT_ACTIONS.REQUIREMENT_CREATED,
    req,
    meta: {
      requirementId: requirement._id,
      medicineName,
      organizationId: org._id,
    },
  });

  res.status(201).json(
    new ApiResponse(201, { requirement }, 'Requirement published successfully.')
  );
});

/**
 * Get requirements published by current NGO organization.
 * @route GET /api/requirements/my
 */
export const getMyRequirements = asyncHandler(async (req, res) => {
  const org = req.organization;
  const { status, urgency, page = 1, limit = 10 } = req.query;

  const query = { organizationId: org._id };
  if (status) query.status = status;
  if (urgency) query.urgency = urgency;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
  const skip = (pageNum - 1) * limitNum;

  const [requirements, total] = await Promise.all([
    Request.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('requestedBy', 'name email'),
    Request.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        requirements,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
      'My requirements retrieved successfully.'
    )
  );
});

/**
 * Get requirement by ID.
 * @route GET /api/requirements/:id
 */
export const getRequirementById = asyncHandler(async (req, res) => {
  const requirement = await Request.findById(req.params.id)
    .populate('organizationId', 'name type city state pincode')
    .populate('requestedBy', 'name');

  if (!requirement) {
    throw new ApiError(404, 'Requirement not found.');
  }

  res.status(200).json(
    new ApiResponse(200, { requirement }, 'Requirement details retrieved.')
  );
});

/**
 * Update a requirement.
 * @route PATCH /api/requirements/:id
 */
export const updateRequirement = asyncHandler(async (req, res) => {
  const requirement = await Request.findById(req.params.id);
  if (!requirement) {
    throw new ApiError(404, 'Requirement not found.');
  }

  const isAdmin = req.user.role === ROLES.ADMIN;
  const isOwner = req.organization && requirement.organizationId.equals(req.organization._id);

  if (!isAdmin && !isOwner) {
    throw new ApiError(403, 'You do not have permission to update this requirement.');
  }

  if (requirement.status !== REQUEST_STATUS.OPEN) {
    throw new ApiError(400, `Cannot update requirement with status '${requirement.status}'.`);
  }

  const fields = ['quantityNeeded', 'unit', 'urgency', 'description', 'neededBy'];
  let hasChanges = false;

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      requirement[f] = req.body[f];
      hasChanges = true;
    }
  }

  if (hasChanges) {
    requirement.statusHistory.push({
      status: requirement.status,
      note: 'Requirement updated',
      at: new Date(),
      by: req.user._id,
    });
    await requirement.save();

    await recordAuditLog({
      userId: req.user._id,
      action: AUDIT_ACTIONS.REQUIREMENT_UPDATED,
      req,
      meta: { requirementId: requirement._id },
    });
  }

  res.status(200).json(
    new ApiResponse(200, { requirement }, 'Requirement updated successfully.')
  );
});

/**
 * Close/cancel a requirement.
 * @route POST /api/requirements/:id/close
 */
export const closeRequirement = asyncHandler(async (req, res) => {
  const requirement = await Request.findById(req.params.id);
  if (!requirement) {
    throw new ApiError(404, 'Requirement not found.');
  }

  const isAdmin = req.user.role === ROLES.ADMIN;
  const isOwner = req.organization && requirement.organizationId.equals(req.organization._id);

  if (!isAdmin && !isOwner) {
    throw new ApiError(403, 'You do not have permission to close this requirement.');
  }

  if (requirement.status !== REQUEST_STATUS.OPEN) {
    throw new ApiError(400, `Cannot close requirement with status '${requirement.status}'.`);
  }

  const { reason = 'Closed by user' } = req.body;
  requirement.status = REQUEST_STATUS.CANCELLED;
  requirement.closedReason = reason;
  requirement.statusHistory.push({
    status: REQUEST_STATUS.CANCELLED,
    note: `Closed: ${reason}`,
    at: new Date(),
    by: req.user._id,
  });
  await requirement.save();

  await recordAuditLog({
    userId: req.user._id,
    action: AUDIT_ACTIONS.REQUIREMENT_CLOSED,
    req,
    meta: { requirementId: requirement._id, reason },
  });

  res.status(200).json(
    new ApiResponse(200, { requirement }, 'Requirement closed successfully.')
  );
});

export default {
  createRequirement,
  getMyRequirements,
  getRequirementById,
  updateRequirement,
  closeRequirement,
};
