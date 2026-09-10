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
    const clean = (str) => String(str || '').toLowerCase().replace(/[-_]/g, ' ').trim();
    const userRole = clean(req.user.role_name || req.user.role || '');
    const userRoleId = Number(req.user.role_id || 0);
    const normalizedRoles = roles.map(clean);

    const isLibrarianAdmin = userRoleId === 2 || userRole === 'librarian admin' || userRole === 'admin librarian' || userRole === 'admin';
    const isSuperAdmin = userRoleId === 1 || userRole === 'super admin';
    const isLibrarian = userRoleId === 3 || userRole === 'librarian';

    let hasPermission = normalizedRoles.includes(userRole);
    if (!hasPermission) {
      if (normalizedRoles.includes('librarian admin') && (isLibrarianAdmin || isSuperAdmin)) hasPermission = true;
      if (normalizedRoles.includes('super admin') && isSuperAdmin) hasPermission = true;
      if (normalizedRoles.includes('librarian') && (isLibrarian || isLibrarianAdmin || isSuperAdmin)) hasPermission = true;
    }

    console.log('[AUTH] User role:', userRole, 'roleId:', userRoleId, 'hasPermission:', hasPermission);

    if (!hasPermission) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = { auth, requireRole };
