import { ROLE_HIERARCHY } from '../constants/roles.js';
import { ROLE_PERMISSIONS } from '../constants/permissions.js';
import { AuthorizationError, AuthenticationError } from '../helpers/error.helper.js';

export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) throw new AuthenticationError('Authentication required');
  if (!roles.includes(req.user.role)) {
    throw new AuthorizationError(
      `Role '${req.user.role}' is not permitted. Required: ${roles.join(' or ')}`,
    );
  }
  next();
};

export const authorizeMinRole = (minRole) => (req, res, next) => {
  if (!req.user) throw new AuthenticationError('Authentication required');
  const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
  if (userLevel < requiredLevel) {
    throw new AuthorizationError(`Insufficient permissions. Required role: ${minRole}`);
  }
  next();
};

export const authorizePermissions = (...requiredPermissions) => (req, res, next) => {
  if (!req.user) throw new AuthenticationError('Authentication required');

  const rolePerms = ROLE_PERMISSIONS[req.user.role] || [];
  const userPerms = req.user.permissions || [];
  const allPerms = new Set([...rolePerms, ...userPerms]);

  const missing = requiredPermissions.filter((p) => !allPerms.has(p));
  if (missing.length > 0) {
    throw new AuthorizationError(
      `Missing permissions: ${missing.join(', ')}`,
    );
  }
  next();
};

export const authorizeOwnerOrAdmin = (getResourceOwnerId) => async (req, res, next) => {
  if (!req.user) throw new AuthenticationError('Authentication required');

  const highPrivilegeRoles = ['super_admin', 'admin'];
  if (highPrivilegeRoles.includes(req.user.role)) {
    req.isOwner = false;
    return next();
  }

  const ownerId = await getResourceOwnerId(req);
  if (!ownerId) throw new AuthorizationError('Resource not found or access denied');

  if (ownerId.toString() !== req.user.id) {
    throw new AuthorizationError('You can only access your own resources');
  }

  req.isOwner = true;
  next();
};
