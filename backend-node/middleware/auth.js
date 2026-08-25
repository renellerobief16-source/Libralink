const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Normalize role names for comparison - check both role and role_name
    const userRole = (req.user.role_name || req.user.role || '').toLowerCase();
    const normalizedRoles = roles.map(role => role.toLowerCase());

    console.log('[AUTH] User role:', userRole);
    console.log('[AUTH] Required roles:', normalizedRoles);
    console.log('[AUTH] Has permission:', normalizedRoles.includes(userRole));

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = { auth, requireRole };
