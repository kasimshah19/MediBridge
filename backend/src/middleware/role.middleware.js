import ApiError from '../utils/ApiError.js';
import { ROLES, APPROVAL_STATUS } from '../config/constants.js';

/**
 * Role authorization middleware.
 * Restricts access to users whose role matches one of the allowed roles.
 *
 * @param {...string} roles - Allowed roles (e.g. 'admin', 'pharmacist')
 */
export const authorizeRoles = (...roles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access forbidden: Role '${req.user.role}' is not authorized to access this resource.`
        )
      );
    }

    next();
  };
};

/**
 * Middleware that requires the user to have the PHARMACIST role AND an APPROVED license status.
 * Returns 403 with a specific, friendly explanation if the pharmacist is still pending or rejected.
 */
export const requireApprovedPharmacist = (req, _res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required.'));
  }

  if (req.user.role !== ROLES.PHARMACIST) {
    return next(
      new ApiError(
        403,
        `Access forbidden: Role '${req.user.role}' is not authorized to access pharmacist verification resources.`
      )
    );
  }

  if (req.user.approvalStatus !== APPROVAL_STATUS.APPROVED) {
    const statusText = req.user.approvalStatus || 'pending';
    return next(
      new ApiError(
        403,
        `Your pharmacist license registration is currently '${statusText}'. Only verified and approved pharmacists can access verification queues and decide on medicines.`
      )
    );
  }

  next();
};

export default authorizeRoles;
