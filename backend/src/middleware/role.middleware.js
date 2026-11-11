import ApiError from '../utils/ApiError.js';

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

export default authorizeRoles;
