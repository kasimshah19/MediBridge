import Medicine from '../models/Medicine.js';
import Donation from '../models/Donation.js';
import Claim from '../models/Claim.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { ROLES, APPROVAL_STATUS } from '../config/constants.js';
import { buildVerifyUrl, generateQrSvg, generateQrPng } from '../services/qr.service.js';
import { decorateMedicine } from '../services/expiry.service.js';

/**
 * GET /api/medicines/:medicineId/qr - Get QR payloads (URL, SVG, PNG) for an approved medicine.
 */
export const getMedicineQr = async (req, res, next) => {
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

    const donation = await Donation.findById(medicine.donationId);
    if (!donation) {
      throw new ApiError(404, 'Parent donation record not found.');
    }

    // Permission check
    const isDonorOwner = donation.donorId.equals(req.user._id);
    const isAdmin = req.user.role === ROLES.ADMIN;
    const isApprovedPharmacist =
      req.user.role === ROLES.PHARMACIST && req.user.approvalStatus === APPROVAL_STATUS.APPROVED;

    let isMatchedNgo = false;
    if (req.user.role === ROLES.NGO && req.user.organizationId) {
      const activeClaim = await Claim.exists({
        organizationId: req.user.organizationId,
        medicineIds: medicine._id,
      });
      if (activeClaim) isMatchedNgo = true;
    }

    if (!isDonorOwner && !isAdmin && !isApprovedPharmacist && !isMatchedNgo) {
      throw new ApiError(403, 'You do not have permission to view the QR code for this medicine.');
    }

    const verifyUrl = buildVerifyUrl(medicine.medicineId);
    const [qrSvg, qrPngBuffer] = await Promise.all([
      generateQrSvg(verifyUrl),
      generateQrPng(verifyUrl, { width: 300 }),
    ]);

    const qrPngBase64 = `data:image/png;base64,${qrPngBuffer.toString('base64')}`;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          medicineId: medicine.medicineId,
          name: medicine.name,
          batchNumber: medicine.batchNumber,
          expiryDate: medicine.expiryDate,
          qrIdentifier: medicine.medicineId,
          issuedAt: medicine.qr?.issuedAt || null,
          verifyUrl,
          qrSvg,
          qrPngBase64,
        },
        'QR code generated successfully.'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/medicines/:medicineId - Get single medicine item details.
 */
export const getMedicineById = async (req, res, next) => {
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

    const decorated = decorateMedicine(medicine);
    return res.status(200).json(new ApiResponse(200, decorated, 'Medicine retrieved successfully.'));
  } catch (error) {
    next(error);
  }
};
