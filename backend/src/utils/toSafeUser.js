/**
 * Strips sensitive fields like passwordHash and reset tokens from user object before returning to client.
 *
 * @param {object} user - Mongoose User document or plain object
 * @returns {object} Sanitized safe user object
 */
export const toSafeUser = (user) => {
  if (!user) return null;

  const userObj = user.toObject ? user.toObject() : { ...user };

  delete userObj.passwordHash;
  delete userObj.passwordResetToken;
  delete userObj.passwordResetExpires;
  delete userObj.failedLoginAttempts;
  delete userObj.lockUntil;
  delete userObj.__v;

  return userObj;
};

export default toSafeUser;
