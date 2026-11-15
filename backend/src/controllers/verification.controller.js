import asyncHandler from '../middleware/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import verificationService from '../services/verification.service.js';

/**
 * 1. GET /api/verification/summary - Real dashboard statistics for the logged-in pharmacist.
 */
export const getSummary = asyncHandler(async (req, res) => {
  const summary = await verificationService.getPharmacistSummary(req.user._id);
  res.status(200).json(new ApiResponse(200, summary, 'Verification summary retrieved successfully.'));
});

/**
 * 2. GET /api/verification/queue - Paginated donation cards for the verification queue.
 */
export const getQueue = asyncHandler(async (req, res) => {
  const { tab, priority, search, sort, page, limit } = req.query;
  const result = await verificationService.getVerificationQueue({
    tab,
    priority,
    search,
    sort,
    page,
    limit,
    pharmacistId: req.user._id,
  });

  res.status(200).json(new ApiResponse(200, result, 'Verification queue retrieved successfully.'));
});

/**
 * 3. GET /api/verification/donations/:id - Full review payload for a donation.
 * Privacy protected: Never returns donor phone, email, address line1, or coordinates.
 */
export const getDonationDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await verificationService.getVerificationDonationDetail({
    donationId: id,
    pharmacistId: req.user._id,
  });

  res.status(200).json(new ApiResponse(200, result.donation, 'Donation review payload retrieved.'));
});

/**
 * 4. POST /api/verification/donations/:id/claim - Claim a donation for exclusive review (60 min TTL).
 */
export const claim = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await verificationService.claimDonation({
    donationId: id,
    pharmacistId: req.user._id,
    req,
  });

  res.status(200).json(new ApiResponse(200, result, 'Donation claimed successfully for verification.'));
});

/**
 * 5. POST /api/verification/donations/:id/release - Release claim held by the pharmacist.
 */
export const release = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await verificationService.releaseDonation({
    donationId: id,
    userId: req.user._id,
    isAdmin: false,
    req,
  });

  res.status(200).json(new ApiResponse(200, result, 'Donation claim released.'));
});

/**
 * 6. POST /api/verification/items/:medicineId/decision - Submit verification decision for a medicine item.
 */
export const decide = asyncHandler(async (req, res) => {
  const { medicineId } = req.params;
  const { decision, checklist, reasonCode, reason, requestedTypes, question } = req.body;

  const result = await verificationService.verifyMedicine({
    medicineId,
    pharmacistId: req.user._id,
    decision,
    checklist,
    reasonCode,
    reason,
    requestedTypes,
    question,
    req,
  });

  res.status(200).json(new ApiResponse(200, result, `Medicine verification decision recorded: ${decision}.`));
});

/**
 * 7. GET /api/verification/history - Past decisions made by the calling pharmacist.
 */
export const getHistory = asyncHandler(async (req, res) => {
  const { decision, search, from, to, page, limit } = req.query;
  const result = await verificationService.getPharmacistHistory({
    pharmacistId: req.user._id,
    decision,
    search,
    from,
    to,
    page,
    limit,
  });

  res.status(200).json(new ApiResponse(200, result, 'Verification history retrieved successfully.'));
});

export default {
  getSummary,
  getQueue,
  getDonationDetail,
  claim,
  release,
  decide,
  getHistory,
};
