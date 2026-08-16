import { verifyAccessToken } from '../utils/tokens.js';
import { getPermissionsForRole } from '../utils/permissions.js';

export const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = verifyAccessToken(token);
    if (decoded.tokenType !== 'access') {
      return res.status(401).json({ message: 'Invalid access token' });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      permissions: decoded.permissions || getPermissionsForRole(decoded.role)
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const requirePermission = (...requiredPermissions) => (req, res, next) => {
  const userPermissions = req.user?.permissions || [];
  const allowed = requiredPermissions.every((permission) =>
    userPermissions.includes(permission)
  );

  if (!allowed) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }

  return next();
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
};
