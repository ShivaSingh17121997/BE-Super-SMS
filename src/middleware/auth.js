const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('./asyncHandler');

/**
 * Protect routes — verify JWT token and attach user to request.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized — no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new ApiError(401, 'Not authorized — user no longer exists');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'Account is deactivated. Contact your administrator.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'Not authorized — invalid token');
  }
});

/**
 * Authorize by role — restrict route access to specific roles.
 * Usage: authorize('super-admin', 'school-admin')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError(401, 'Not authorized');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `Role '${req.user.role}' is not authorized to access this route`);
    }

    next();
  };
};

/**
 * Tenant isolation middleware.
 * For non-super-admin users, automatically scopes all queries and mutations
 * to the user's schoolId, preventing cross-tenant data access.
 */
const tenant = (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Not authorized');
  }

  // Super admins can access all schools
  if (req.user.role === 'super-admin') {
    return next();
  }

  const schoolId = req.user.schoolId;

  if (!schoolId) {
    throw new ApiError(403, 'No school associated with this account');
  }

  // Inject schoolId into query params for GET requests
  req.query.schoolId = schoolId.toString();

  // Inject schoolId into body for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.body.schoolId = schoolId.toString();
  }

  // Store schoolId for easy access in controllers
  req.schoolId = schoolId.toString();

  next();
};

module.exports = { protect, authorize, tenant };
