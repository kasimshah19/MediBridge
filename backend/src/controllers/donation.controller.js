import Donation from '../models/Donation.js';
import Medicine from '../models/Medicine.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import {
  DONATION_STATUS,
  MEDICINE_STATUS,
  AUDIT_ACTIONS,
  REJECTION_SOURCES,
  SCREENING_CODES,
  ROLES,
  APPROVAL_STATUS,
} from '../config/constants.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { generateDonationCode, generateMedicineId } from '../utils/generateId.js';
import { screenMedicine } from '../services/screening.service.js';
import { calculatePriority, normalizeExpiryDate } from '../services/expiry.service.js';
import storageService from '../services/storage.service.js';

/**
 * 1. POST /api/donations - Create a DRAFT donation with items.
 */
export const createDraftDonation = async (req, res, next) => {
  try {
    const donorId = req.user._id;

    // Limit active drafts per donor (max 5)
    const draftCount = await Donation.countDocuments({
      donorId,
      status: DONATION_STATUS.DRAFT,
    });

    if (draftCount >= 5) {
      throw new ApiError(
        409,
        'You already have 5 active draft donations. Please complete, submit, or delete existing drafts before creating a new one.'
      );
    }

    const { items, pickupAddress, location, contactPhone, preferredTimeSlot, notes } = req.body;

    // Create donation shell
    const donation = new Donation({
      donorId,
      status: DONATION_STATUS.DRAFT,
      pickupAddress,
      location: {
        type: 'Point',
        coordinates: [location.lng, location.lat],
      },
      contactPhone,
      preferredTimeSlot: preferredTimeSlot || '',
      notes: notes || '',
      statusHistory: [
        {
          status: DONATION_STATUS.DRAFT,
          note: 'Donation draft initialized',
          by: donorId,
          at: new Date(),
        },
      ],
    });

    // Create associated medicine item records
    const createdItemIds = [];
    for (const item of items) {
      const normalizedExpiry = normalizeExpiryDate(item.expiryDate);
      const priority = normalizedExpiry
        ? calculatePriority(normalizedExpiry)
        : 'normal';

      const medicine = await Medicine.create({
        donationId: donation._id,
        donorId,
        name: item.name,
        nameLower: (item.name || '').toLowerCase().trim(),
        genericName: item.genericName || '',
        manufacturer: item.manufacturer || '',
        batchNumber: (item.batchNumber || '').toUpperCase().trim(),
        manufacturingDate: item.manufacturingDate || null,
        expiryDate: normalizedExpiry || new Date(),
        quantity: item.quantity,
        unit: item.unit,
        unitsPerPack: item.unitsPerPack || null,
        medicineType: item.medicineType,
        packagingCondition: item.packagingCondition,
        storageCondition: item.storageCondition,
        storageHistory: item.storageHistory || '',
        isPrescriptionOnly: Boolean(item.isPrescriptionOnly),
        priority,
        status: MEDICINE_STATUS.PENDING,
        photos: [],
      });

      createdItemIds.push(medicine._id);
    }

    donation.items = createdItemIds;
    await donation.save();

    await AuditLog.create({
      userId: donorId,
      action: AUDIT_ACTIONS.DONATION_CREATED,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      meta: { donationId: donation._id, itemCount: createdItemIds.length },
    });

    const populatedDonation = await Donation.findById(donation._id).populate('items');

    return res
      .status(201)
      .json(new ApiResponse(201, populatedDonation, 'Donation draft created successfully.'));
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET /api/donations/my - Paginated list of my donations with counts.
 */
export const getMyDonations = async (req, res, next) => {
  try {
    const donorId = req.user._id;
    const { status, search, page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = { donorId };

    if (status && status !== 'all') {
      if (status === 'rejected') {
        filter.status = { $in: [DONATION_STATUS.SCREENING_REJECTED, DONATION_STATUS.REJECTED] };
      } else {
        filter.status = status;
      }
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      // Search by donationCode OR matching medicine name
      const matchingMeds = await Medicine.find({
        donorId,
        $or: [{ name: searchRegex }, { genericName: searchRegex }],
      }).select('donationId');

      const matchedDonationIds = matchingMeds.map((m) => m.donationId);

      filter.$or = [
        { donationCode: searchRegex },
        { _id: { $in: matchedDonationIds } },
      ];
    }

    const [donations, total] = await Promise.all([
      Donation.find(filter)
        .populate('items')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Donation.countDocuments(filter),
    ]);

    // Calculate status counts for UI tabs
    const [
      allCount,
      draftCount,
      submittedCount,
      underVerificationCount,
      approvedCount,
      rejectedCount,
      cancelledCount,
    ] = await Promise.all([
      Donation.countDocuments({ donorId }),
      Donation.countDocuments({ donorId, status: DONATION_STATUS.DRAFT }),
      Donation.countDocuments({ donorId, status: DONATION_STATUS.SUBMITTED }),
      Donation.countDocuments({ donorId, status: DONATION_STATUS.UNDER_VERIFICATION }),
      Donation.countDocuments({
        donorId,
        status: {
          $in: [
            DONATION_STATUS.APPROVED,
            DONATION_STATUS.MATCHED,
            DONATION_STATUS.HANDED_OVER,
            DONATION_STATUS.COMPLETED,
          ],
        },
      }),
      Donation.countDocuments({
        donorId,
        status: { $in: [DONATION_STATUS.SCREENING_REJECTED, DONATION_STATUS.REJECTED] },
      }),
      Donation.countDocuments({ donorId, status: DONATION_STATUS.CANCELLED }),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          donations,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum) || 1,
          },
          counts: {
            all: allCount,
            draft: draftCount,
            submitted: submittedCount,
            under_verification: underVerificationCount,
            approved: approvedCount,
            rejected: rejectedCount,
            cancelled: cancelledCount,
          },
        },
        'Donations retrieved successfully.'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 3. GET /api/donations/my/summary - Real dashboard counts for donor.
 */
export const getMyDonationsSummary = async (req, res, next) => {
  try {
    const donorId = req.user._id;

    const [
      total,
      drafts,
      underVerification,
      approved,
      rejected,
      cancelled,
      totalMedicineItems,
    ] = await Promise.all([
      Donation.countDocuments({ donorId }),
      Donation.countDocuments({ donorId, status: DONATION_STATUS.DRAFT }),
      Donation.countDocuments({
        donorId,
        status: {
          $in: [
            DONATION_STATUS.SUBMITTED,
            DONATION_STATUS.UNDER_VERIFICATION,
            DONATION_STATUS.MORE_INFO_REQUIRED,
          ],
        },
      }),
      Donation.countDocuments({
        donorId,
        status: {
          $in: [
            DONATION_STATUS.APPROVED,
            DONATION_STATUS.MATCHED,
            DONATION_STATUS.HANDED_OVER,
            DONATION_STATUS.COMPLETED,
          ],
        },
      }),
      Donation.countDocuments({
        donorId,
        status: { $in: [DONATION_STATUS.SCREENING_REJECTED, DONATION_STATUS.REJECTED] },
      }),
      Donation.countDocuments({ donorId, status: DONATION_STATUS.CANCELLED }),
      Medicine.countDocuments({ donorId }),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          total,
          drafts,
          underVerification,
          approved,
          rejected,
          cancelled,
          totalMedicineItems,
        },
        'Donations summary retrieved successfully.'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 4. GET /api/donations/:id - Full details with items & photo metadata.
 */
export const getDonationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const donation = await Donation.findById(id).populate('items');

    if (!donation) {
      throw new ApiError(404, 'Donation record not found.');
    }

    // Authorization: Owner, Admin, or Approved Pharmacist
    const isOwner = donation.donorId.equals(req.user._id);
    const isAdmin = req.user.role === ROLES.ADMIN;
    const isApprovedPharmacist =
      req.user.role === ROLES.PHARMACIST && req.user.approvalStatus === APPROVAL_STATUS.APPROVED;

    if (!isOwner && !isAdmin && !isApprovedPharmacist) {
      // 404 to avoid revealing existence
      throw new ApiError(404, 'Donation record not found.');
    }

    return res.status(200).json(new ApiResponse(200, donation, 'Donation retrieved successfully.'));
  } catch (error) {
    next(error);
  }
};

/**
 * 5. PATCH /api/donations/:id - Edit draft donation details and items.
 */
export const updateDraftDonation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const donorId = req.user._id;

    const donation = await Donation.findOne({ _id: id, donorId });
    if (!donation) {
      throw new ApiError(404, 'Draft donation not found.');
    }

    if (donation.status !== DONATION_STATUS.DRAFT) {
      throw new ApiError(409, 'Only draft donations can be updated.');
    }

    const { items, pickupAddress, location, contactPhone, preferredTimeSlot, notes } = req.body;

    if (pickupAddress) donation.pickupAddress = pickupAddress;
    if (location) {
      donation.location = {
        type: 'Point',
        coordinates: [location.lng, location.lat],
      };
    }
    if (contactPhone) donation.contactPhone = contactPhone;
    if (preferredTimeSlot !== undefined) donation.preferredTimeSlot = preferredTimeSlot;
    if (notes !== undefined) donation.notes = notes;

    // Handle items merge/replace if items provided
    if (items && Array.isArray(items)) {
      const existingMeds = await Medicine.find({ donationId: donation._id });
      const incomingItemIds = items.filter((i) => i._id).map((i) => String(i._id));

      // 1. Delete removed items and their photos
      for (const med of existingMeds) {
        if (!incomingItemIds.includes(String(med._id))) {
          // Delete photos from disk
          for (const photo of med.photos) {
            await storageService.deleteMedicinePhoto(donation._id, med._id, photo.storedName);
          }
          await med.deleteOne();
        }
      }

      // 2. Update existing or create new items
      const updatedItemIds = [];
      for (const item of items) {
        const normalizedExpiry = normalizeExpiryDate(item.expiryDate);
        const priority = normalizedExpiry
          ? calculatePriority(normalizedExpiry)
          : 'normal';

        if (item._id) {
          const updatedMed = await Medicine.findByIdAndUpdate(
            item._id,
            {
              name: item.name,
              nameLower: (item.name || '').toLowerCase().trim(),
              genericName: item.genericName || '',
              manufacturer: item.manufacturer || '',
              batchNumber: (item.batchNumber || '').toUpperCase().trim(),
              manufacturingDate: item.manufacturingDate || null,
              expiryDate: normalizedExpiry || new Date(),
              quantity: item.quantity,
              unit: item.unit,
              unitsPerPack: item.unitsPerPack || null,
              medicineType: item.medicineType,
              packagingCondition: item.packagingCondition,
              storageCondition: item.storageCondition,
              storageHistory: item.storageHistory || '',
              isPrescriptionOnly: Boolean(item.isPrescriptionOnly),
              priority,
            },
            { new: true }
          );
          if (updatedMed) updatedItemIds.push(updatedMed._id);
        } else {
          const newMed = await Medicine.create({
            donationId: donation._id,
            donorId,
            name: item.name,
            nameLower: (item.name || '').toLowerCase().trim(),
            genericName: item.genericName || '',
            manufacturer: item.manufacturer || '',
            batchNumber: (item.batchNumber || '').toUpperCase().trim(),
            manufacturingDate: item.manufacturingDate || null,
            expiryDate: normalizedExpiry || new Date(),
            quantity: item.quantity,
            unit: item.unit,
            unitsPerPack: item.unitsPerPack || null,
            medicineType: item.medicineType,
            packagingCondition: item.packagingCondition,
            storageCondition: item.storageCondition,
            storageHistory: item.storageHistory || '',
            isPrescriptionOnly: Boolean(item.isPrescriptionOnly),
            priority,
            status: MEDICINE_STATUS.PENDING,
            photos: [],
          });
          updatedItemIds.push(newMed._id);
        }
      }

      donation.items = updatedItemIds;
    }

    await donation.save();

    await AuditLog.create({
      userId: donorId,
      action: AUDIT_ACTIONS.DONATION_UPDATED,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      meta: { donationId: donation._id },
    });

    const updatedDonation = await Donation.findById(donation._id).populate('items');
    return res
      .status(200)
      .json(new ApiResponse(200, updatedDonation, 'Donation draft updated successfully.'));
  } catch (error) {
    next(error);
  }
};

/**
 * 6. DELETE /api/donations/:id - Delete draft donation and photo files.
 */
export const deleteDraftDonation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const donorId = req.user._id;

    const donation = await Donation.findOne({ _id: id, donorId });
    if (!donation) {
      throw new ApiError(404, 'Draft donation not found.');
    }

    if (donation.status !== DONATION_STATUS.DRAFT) {
      throw new ApiError(409, 'Only draft donations can be deleted.');
    }

    // Delete photos folder from disk storage
    await storageService.deleteDonationPhotos(donation._id);

    // Delete medicine documents
    await Medicine.deleteMany({ donationId: donation._id });

    // Delete donation
    await donation.deleteOne();

    await AuditLog.create({
      userId: donorId,
      action: AUDIT_ACTIONS.DONATION_DELETED,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      meta: { donationId: id },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, 'Draft donation and associated files deleted.'));
  } catch (error) {
    next(error);
  }
};

/**
 * 7. POST /api/donations/:id/items/:itemId/photos - Upload photo for a medicine item.
 */
export const uploadItemPhoto = async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const donorId = req.user._id;

    const donation = await Donation.findOne({ _id: id, donorId });
    if (!donation) {
      throw new ApiError(404, 'Donation not found.');
    }

    if (donation.status !== DONATION_STATUS.DRAFT) {
      throw new ApiError(409, 'Photos can only be added to draft donations.');
    }

    const medicine = await Medicine.findOne({ _id: itemId, donationId: donation._id });
    if (!medicine) {
      throw new ApiError(404, 'Medicine item not found in this donation.');
    }

    if (medicine.photos.length >= env.MAX_PHOTOS_PER_MEDICINE) {
      throw new ApiError(
        400,
        `Maximum ${env.MAX_PHOTOS_PER_MEDICINE} photos allowed per medicine item.`
      );
    }

    const saved = await storageService.saveMedicinePhoto(donation._id, medicine._id, req.file);

    medicine.photos.push({
      originalName: saved.originalName,
      storedName: saved.storedName,
      mimeType: saved.mimeType,
      size: saved.size,
      uploadedAt: new Date(),
    });

    await medicine.save();

    await AuditLog.create({
      userId: donorId,
      action: AUDIT_ACTIONS.DONATION_PHOTO_UPLOADED,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      meta: { donationId: donation._id, itemId: medicine._id },
    });

    const newPhoto = medicine.photos[medicine.photos.length - 1];

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          _id: newPhoto._id,
          originalName: newPhoto.originalName,
          mimeType: newPhoto.mimeType,
          size: newPhoto.size,
          uploadedAt: newPhoto.uploadedAt,
        },
        'Photo uploaded successfully.'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 8. DELETE /api/donations/:id/items/:itemId/photos/:photoId - Delete photo from draft.
 */
export const deleteItemPhoto = async (req, res, next) => {
  try {
    const { id, itemId, photoId } = req.params;
    const donorId = req.user._id;

    const donation = await Donation.findOne({ _id: id, donorId });
    if (!donation) {
      throw new ApiError(404, 'Donation not found.');
    }

    if (donation.status !== DONATION_STATUS.DRAFT) {
      throw new ApiError(409, 'Photos can only be removed from draft donations.');
    }

    const medicine = await Medicine.findOne({
      _id: itemId,
      donationId: donation._id,
    }).select('+photos.storedName');

    if (!medicine) {
      throw new ApiError(404, 'Medicine item not found in this donation.');
    }

    const photo = medicine.photos.id(photoId);
    if (!photo) {
      throw new ApiError(404, 'Photo record not found.');
    }

    // Delete file from disk
    await storageService.deleteMedicinePhoto(donation._id, medicine._id, photo.storedName);

    // Remove subdocument
    medicine.photos.pull({ _id: photoId });
    await medicine.save();

    await AuditLog.create({
      userId: donorId,
      action: AUDIT_ACTIONS.DONATION_PHOTO_DELETED,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      meta: { donationId: donation._id, itemId: medicine._id, photoId },
    });

    return res.status(200).json(new ApiResponse(200, null, 'Photo deleted successfully.'));
  } catch (error) {
    next(error);
  }
};

/**
 * 9. GET /api/donations/:donationId/items/:itemId/photos/:photoId/file - Stream photo.
 * Allowed for: Owner Donor, Admin, or Approved Pharmacist.
 */
export const streamItemPhoto = async (req, res, next) => {
  try {
    const { donationId, itemId, photoId } = req.params;

    const donation = await Donation.findById(donationId);
    if (!donation) {
      throw new ApiError(404, 'Donation not found.');
    }

    // Authorization check
    const isOwner = donation.donorId.equals(req.user._id);
    const isAdmin = req.user.role === ROLES.ADMIN;
    const isApprovedPharmacist =
      req.user.role === ROLES.PHARMACIST && req.user.approvalStatus === APPROVAL_STATUS.APPROVED;

    if (!isOwner && !isAdmin && !isApprovedPharmacist) {
      throw new ApiError(403, 'You do not have permission to view this medicine photograph.');
    }

    const medicine = await Medicine.findOne({
      _id: itemId,
      donationId: donation._id,
    }).select('+photos.storedName');

    if (!medicine) {
      throw new ApiError(404, 'Medicine item not found.');
    }

    const photo = medicine.photos.id(photoId);
    if (!photo) {
      throw new ApiError(404, 'Photo not found.');
    }

    res.setHeader('Content-Type', photo.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${photo.originalName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const fileStream = storageService.readMedicinePhotoStream(
      donation._id,
      medicine._id,
      photo.storedName
    );

    fileStream.on('error', (err) => {
      if (err.code === 'ENOENT') {
        return next(new ApiError(404, 'Photo file not found on storage.'));
      }
      return next(err);
    });

    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * 10. POST /api/donations/:id/submit - Main screening and submission logic.
 */
export const submitDonation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const donorId = req.user._id;

    const donation = await Donation.findOne({ _id: id, donorId });
    if (!donation) {
      throw new ApiError(404, 'Donation not found.');
    }

    if (donation.status !== DONATION_STATUS.DRAFT) {
      throw new ApiError(409, 'Only draft donations can be submitted for verification.');
    }

    const { declarations } = req.body;
    if (
      !declarations ||
      !declarations.sealedAndUnused ||
      !declarations.storedProperly ||
      !declarations.notControlled ||
      !declarations.genuineInfo
    ) {
      throw new ApiError(
        422,
        'All compliance declarations must be confirmed as true before submission.'
      );
    }

    donation.declarations = declarations;

    // Fetch all items for this donation
    const medicines = await Medicine.find({ donationId: donation._id });
    if (medicines.length === 0) {
      throw new ApiError(400, 'At least 1 medicine item is required to submit a donation.');
    }

    // Fetch donor's existing active items to detect duplicates across submissions
    const activeDonations = await Donation.find({
      donorId,
      status: { $nin: [DONATION_STATUS.DRAFT, DONATION_STATUS.CANCELLED] },
      _id: { $ne: donation._id },
    }).select('_id');

    const activeDonationIds = activeDonations.map((d) => d._id);
    const existingActiveMedicines = await Medicine.find({
      donorId,
      donationId: { $in: activeDonationIds },
    });

    // Screen each item
    const screenedMedicines = [];
    let passedCount = 0;
    let failedCount = 0;

    for (const med of medicines) {
      // Assign unique medicineId if not assigned yet
      if (!med.medicineId) {
        med.medicineId = await generateMedicineId();
      }

      // Check duplicate against existing active items
      const isDuplicate = existingActiveMedicines.some((existing) => {
        const sameName =
          (existing.nameLower || existing.name.toLowerCase()).trim() ===
          (med.nameLower || med.name.toLowerCase()).trim();
        const sameBatch =
          (existing.batchNumber || '').toUpperCase().trim() ===
          (med.batchNumber || '').toUpperCase().trim();
        const sameExpiry =
          new Date(existing.expiryDate).getTime() === new Date(med.expiryDate).getTime();
        return sameName && sameBatch && sameExpiry;
      });

      // Run automated screening
      const screeningResult = screenMedicine(med, {
        now: new Date(),
        minShelfLifeDays: env.MIN_REMAINING_SHELF_LIFE_DAYS,
        declarations,
      });

      if (isDuplicate) {
        screeningResult.reasons.unshift({
          code: SCREENING_CODES.DUPLICATE_ITEM,
          message: `Duplicate item: A donation for "${med.name}" with batch "${med.batchNumber}" and identical expiration date has already been submitted.`,
        });
        screeningResult.status = 'rejected';
      }

      // Priority computation
      med.priority = calculatePriority(med.expiryDate);

      if (screeningResult.status === 'passed') {
        med.status = MEDICINE_STATUS.PENDING;
        med.rejectionSource = null;
        med.screening = {
          status: 'passed',
          reasons: [],
          checkedAt: new Date(),
        };
        passedCount++;
      } else {
        med.status = MEDICINE_STATUS.REJECTED;
        med.rejectionSource = REJECTION_SOURCES.AUTO_SCREENING;
        med.screening = {
          status: 'rejected',
          reasons: screeningResult.reasons,
          checkedAt: new Date(),
        };
        failedCount++;
      }

      await med.save();
      screenedMedicines.push(med);
    }

    // Assign donation code if not yet set
    if (!donation.donationCode) {
      donation.donationCode = await generateDonationCode();
    }

    donation.submittedAt = new Date();

    if (passedCount === 0) {
      donation.status = DONATION_STATUS.SCREENING_REJECTED;
      donation.rejectionReason =
        'All submitted items failed automated safety and regulatory compliance checks.';
      donation.statusHistory.push({
        status: DONATION_STATUS.SCREENING_REJECTED,
        note: 'All items failed automated screening',
        by: donorId,
        at: new Date(),
      });

      await AuditLog.create({
        userId: donorId,
        action: AUDIT_ACTIONS.DONATION_SCREENING_REJECTED,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        meta: {
          donationId: donation._id,
          donationCode: donation.donationCode,
          itemCount: medicines.length,
        },
      });

      // In-app notification
      await Notification.create({
        userId: donorId,
        title: 'Donation Screening Notice',
        message: `Donation ${donation.donationCode} could not be accepted because none of the items met regulatory acceptance policies. Click to review item details.`,
        type: 'donation',
        link: `/donor/donations/${donation._id}`,
      });
    } else {
      donation.status = DONATION_STATUS.UNDER_VERIFICATION;
      donation.rejectionReason = null;
      donation.statusHistory.push({
        status: DONATION_STATUS.UNDER_VERIFICATION,
        note: `${passedCount} of ${medicines.length} items passed automated screening and queued for pharmacist verification`,
        by: donorId,
        at: new Date(),
      });

      await AuditLog.create({
        userId: donorId,
        action: AUDIT_ACTIONS.DONATION_SUBMITTED,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        meta: {
          donationId: donation._id,
          donationCode: donation.donationCode,
          passedCount,
          failedCount,
        },
      });

      // In-app notification
      await Notification.create({
        userId: donorId,
        title: 'Donation Submitted for Verification',
        message: `Donation ${donation.donationCode} (${passedCount} items) passed automated screening and is now awaiting licensed pharmacist inspection.`,
        type: 'donation',
        link: `/donor/donations/${donation._id}`,
      });
    }

    await donation.save();

    const resultDonation = await Donation.findById(donation._id).populate('items');

    return res.status(200).json(
      new ApiResponse(
        200,
        resultDonation,
        passedCount > 0
          ? 'Donation submitted successfully and queued for pharmacist inspection.'
          : 'Donation screening completed. All items failed safety acceptance checks.'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * 11. POST /api/donations/:id/cancel - Cancel donation before approval.
 */
export const cancelDonation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const donorId = req.user._id;

    const donation = await Donation.findOne({ _id: id, donorId });
    if (!donation) {
      throw new ApiError(404, 'Donation not found.');
    }

    const cancellableStatuses = [
      DONATION_STATUS.UNDER_VERIFICATION,
      DONATION_STATUS.MORE_INFO_REQUIRED,
      DONATION_STATUS.SUBMITTED,
    ];

    if (!cancellableStatuses.includes(donation.status)) {
      throw new ApiError(
        409,
        `Donation with status "${donation.status}" cannot be cancelled.`
      );
    }

    donation.status = DONATION_STATUS.CANCELLED;
    donation.cancelledAt = new Date();
    donation.cancelReason = reason;
    donation.statusHistory.push({
      status: DONATION_STATUS.CANCELLED,
      note: `Cancelled by donor: ${reason}`,
      by: donorId,
      at: new Date(),
    });

    // Mark pending items as rejected with source donor_cancelled
    await Medicine.updateMany(
      { donationId: donation._id, status: MEDICINE_STATUS.PENDING },
      {
        status: MEDICINE_STATUS.REJECTED,
        rejectionSource: REJECTION_SOURCES.DONOR_CANCELLED,
      }
    );

    await donation.save();

    await AuditLog.create({
      userId: donorId,
      action: AUDIT_ACTIONS.DONATION_CANCELLED,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      meta: { donationId: donation._id, reason },
    });

    return res
      .status(200)
      .json(new ApiResponse(200, donation, 'Donation cancelled successfully.'));
  } catch (error) {
    next(error);
  }
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
  streamItemPhoto,
  submitDonation,
  cancelDonation,
};
