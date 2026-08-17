import { AuthorizationError } from '../helpers/error.helper.js';
import { ROLES } from '../constants/roles.js';

export const requireApiAccess = (req, res, next) => {
  const user = req.user;
  if (!user) return next(new AuthorizationError('Authentication required'));

  if (user.role === ROLES.RETAILER && !user.apiAccessEnabled) {
    throw new AuthorizationError(
      'API access is not enabled for your account. Please contact your administrator.',
    );
  }

  next();
};
