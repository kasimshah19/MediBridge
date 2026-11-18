import Transfer from '../models/Transfer.js';
import Claim from '../models/Claim.js';
import Donation from '../models/Donation.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { ROLES, TRANSFER_STATUS } from '../config/constants.js';
import {
  generateTransferHandoverToken,
  lookupHandoverTransfer,
  receiveTransferItems,
} from '../services/transfer.service.js';
import { generateReceiptPdf } from '../services/pdf.service.js';

/**
 * GET /api/transfers/my - List transfers for current authenticated user (Donor or NGO).
 */
export const getMyTransfers = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (req.user.role === ROLES.DONOR) {
      filter.donorId = req.user._id;
    } else if (req.user.role === ROLES.NGO) {
      if (!req.user.organizationId) {
        throw new ApiError(400, 'User is not linked to any organization.');
      }
      filter.organizationId = req.user.organizationId;
    } else if (req.user.role !== ROLES.ADMIN) {
      throw new ApiError(403, 'Unauthorized access to transfers.');
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    const [transfers, total] = await Promise.all([
      Transfer.find(filter)
        .populate('donationId', 'donationCode pickupAddress location')
        .populate('organizationId', 'name type city state')
        .populate('donorId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Transfer.countDocuments(filter),
    ]);

    // Sanitize donor name for NGO viewing
    const sanitized = transfers.map((tr) => {
      const trObj = tr.toObject();
      if (req.user.role === ROLES.NGO && trObj.donorId?.name) {
        const parts = trObj.donorId.name.trim().split(/\s+/);
        trObj.donorDisplayName =
          parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
      }
      return trObj;
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          transfers: sanitized,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum),
          },
        },
        'Transfers retrieved successfully.'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/transfers/:id - Full details for a single transfer.
 */
export const getTransferById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transfer = await Transfer.findById(id)
      .populate('donationId', 'donationCode pickupAddress location contactPhone')
      .populate('organizationId', 'name type phone email address city state pincode')
      .populate('donorId', 'name email phone')
      .populate('claimId', 'claimCode status initiatedBy');

    if (!transfer) {
      throw new ApiError(404, 'Transfer record not found.');
    }

    // Permission check
    const isDonor = transfer.donorId._id.equals(req.user._id);
    const isNgo =
      req.user.role === ROLES.NGO &&
      req.user.organizationId &&
      req.user.organizationId.equals(transfer.organizationId._id);
    const isAdmin = req.user.role === ROLES.ADMIN;

    if (!isDonor && !isNgo && !isAdmin) {
      throw new ApiError(403, 'You do not have permission to view this transfer.');
    }

    const result = transfer.toObject();

    // Privacy calibration: redact donor contact info if requester is NGO
    if (isNgo && !isAdmin) {
      const parts = (result.donorId?.name || '').trim().split(/\s+/);
      result.donorDisplayName =
        parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
      delete result.donorId?.email;
      delete result.donorId?.phone;
      delete result.donationId?.contactPhone;
    }

    return res.status(200).json(new ApiResponse(200, result, 'Transfer retrieved successfully.'));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/transfers/:id/handover-token - Generate a 15-min ephemeral handover token (Donor only).
 */
export const generateHandoverTokenController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await generateTransferHandoverToken(id, req.user._id);

    return res.status(200).json(
      new ApiResponse(200, result, 'Handover token generated successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/transfers/handover/lookup - Lookup & preview transfer for NGO receipt.
 */
export const lookupHandoverController = async (req, res, next) => {
  try {
    const { code, token } = req.body;

    if (!token) {
      throw new ApiError(400, 'Handover pass token is required.');
    }

    if (req.user.role !== ROLES.NGO && req.user.role !== ROLES.ADMIN) {
      throw new ApiError(403, 'Only NGOs or administrators can verify handover passes.');
    }

    if (!req.user.organizationId && req.user.role !== ROLES.ADMIN) {
      throw new ApiError(400, 'User is not linked to any verified organization.');
    }

    const transfer = await lookupHandoverTransfer({
      code,
      token,
      organizationId: req.user.organizationId,
      req,
      userId: req.user._id,
    });

    return res.status(200).json(
      new ApiResponse(200, transfer, 'Handover transfer verified and ready for receipt.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/transfers/:id/receive - Process checklist and receipt decisions for transfer items.
 */
export const receiveTransferItemsController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { token, items } = req.body;

    const updated = await receiveTransferItems({
      transferId: id,
      user: req.user,
      token,
      items,
      req,
    });

    return res.status(200).json(
      new ApiResponse(200, updated, 'Transfer items received and custody updated successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/transfers/:id/receipt.pdf - Download official handover receipt PDF.
 */
export const downloadReceiptPdfController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transfer = await Transfer.findById(id)
      .populate('donationId', 'donationCode')
      .populate('organizationId', 'name type phone email address')
      .populate('donorId', 'name')
      .populate('claimId', 'claimCode');

    if (!transfer) {
      throw new ApiError(404, 'Transfer record not found.');
    }

    // Permission check
    const isDonor = transfer.donorId._id.equals(req.user._id);
    const isNgo =
      req.user.role === ROLES.NGO &&
      req.user.organizationId &&
      req.user.organizationId.equals(transfer.organizationId._id);
    const isAdmin = req.user.role === ROLES.ADMIN;

    if (!isDonor && !isNgo && !isAdmin) {
      throw new ApiError(403, 'You do not have permission to download this receipt.');
    }

    const pdfBuffer = await generateReceiptPdf(
      transfer,
      transfer.claimId,
      transfer.donorId,
      transfer.organizationId
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="medibridge-receipt-${transfer.transferCode}.pdf"`
    );
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
