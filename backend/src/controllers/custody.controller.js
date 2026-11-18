import Medicine from '../models/Medicine.js';
import Donation from '../models/Donation.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { ROLES, APPROVAL_STATUS } from '../config/constants.js';
import { buildTrace } from '../services/custody.service.js';

/**
 * GET /api/custody/medicines/:medicineId - Retrieve role-calibrated custody trace for a medicine item.
 */
export const getMedicineCustody = async (req, res, next) => {
  try {
    const { medicineId } = req.params;

    const medicine = await Medicine.findOne({
      $or: [
        { medicineId },
        { _id: medicineId.match(/^[0-9a-fA-F]{24}$/) ? medicineId : null },
      ],
    });

    if (!medicine) {
      throw new ApiError(404, 'Medicine record not found.');
    }

    const trace = await buildTrace(medicine._id, req.user.role);

    return res.status(200).json(
      new ApiResponse(200, trace, 'Custody trace retrieved successfully.')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/custody/donations/:id - Retrieve custody traces for all items in a donation.
 */
export const getDonationCustody = async (req, res, next) => {
  try {
    const { id } = req.params;

    const donation = await Donation.findById(id).populate('items');
    if (!donation) {
      throw new ApiError(404, 'Donation record not found.');
    }

    // Permission check
    const isOwner = donation.donorId.equals(req.user._id);
    const isAdmin = req.user.role === ROLES.ADMIN;
    const isApprovedPharmacist =
      req.user.role === ROLES.PHARMACIST && req.user.approvalStatus === APPROVAL_STATUS.APPROVED;

    if (!isOwner && !isAdmin && !isApprovedPharmacist) {
      throw new ApiError(403, 'You do not have permission to view custody traces for this donation.');
    }

    const traces = {};
    for (const item of donation.items || []) {
      const trace = await buildTrace(item._id, req.user.role);
      traces[item.medicineId || item._id.toString()] = trace;
    }

    return res.status(200).json(
      new ApiResponse(200, { donationId: donation._id, donationCode: donation.donationCode, items: traces }, 'Donation custody traces retrieved successfully.')
    );
  } catch (error) {
    next(error);
  }
};
