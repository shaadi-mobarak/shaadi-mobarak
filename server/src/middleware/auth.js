import jwt from 'jsonwebtoken';
import User from '../models/User.js';
// The JWT only proves who signed in. Every authenticated request reloads the
// user from the DB (a single indexed findById) so that suspension, demotion
// or deletion takes effect immediately instead of living on for the token's
// 24-hour life. The role used by allowRoles() therefore always comes from
// the DB, never from the (possibly stale) token.
export async function requireAuth(req, res, next) {
  const token = req.cookies?.sm_session;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
  catch { return res.status(401).json({ message: 'Session expired or invalid' }); }
  try {
    const user = await User.findById(decoded.sub).select('_id role accountStatus');
    if (!user || user.accountStatus !== 'active') return res.status(401).json({ message: 'Account is not active' });
    req.auth = { sub: String(user._id), role: user.role };
    next();
  } catch (e) {
    if (e && e.name === 'CastError') return res.status(401).json({ message: 'Session expired or invalid' });
    next(e);
  }
}
export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.auth || !roles.includes(req.auth.role)) return res.status(403).json({ message: 'Access denied' });
  next();
};
