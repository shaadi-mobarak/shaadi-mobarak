import jwt from 'jsonwebtoken';
export function requireAuth(req, res, next) {
  const token = req.cookies?.sm_session;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try { req.auth = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({ message: 'Session expired or invalid' }); }
}
export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.auth || !roles.includes(req.auth.role)) return res.status(403).json({ message: 'Access denied' });
  next();
};
