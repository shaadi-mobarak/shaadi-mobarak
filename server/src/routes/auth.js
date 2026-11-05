import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
const registerSchema = z.object({ fullName: z.string().trim().min(2).max(100), email: z.string().trim().email().max(160), password: z.string().min(10).max(72) });
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(72) });
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 24 * 60 * 60 * 1000 };
function issueSession(user, res) {
  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
  res.cookie('sm_session', token, cookieOptions);
}
router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Please check the submitted information', errors: parsed.error.flatten() });
    const { fullName, email, password } = parsed.data;
    if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with this email already exists' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName, email, passwordHash });
    // New accounts remain pending until verification/approval is implemented.
    res.status(201).json({ message: 'Registration received. Account activation is pending.', user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, accountStatus: user.accountStatus } });
  } catch (e) { next(e); }
});
router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid login details' });
    const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect' });
    if (user.accountStatus !== 'active') return res.status(403).json({ message: 'Your account is awaiting activation or is unavailable' });
    issueSession(user, res);
    res.json({ user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});
router.get('/me', requireAuth, async (req, res, next) => {
  try { const user = await User.findById(req.auth.sub).select('fullName email role accountStatus emailVerified phone phoneVerified privacy partnerPreferences'); if (!user) return res.status(401).json({ message: 'Account not found' }); res.json({ user }); }
  catch (e) { next(e); }
});
// OTP architecture: a 6-digit code is hashed and stored with expiry. No SMS/email provider is
// configured yet, so no code is actually delivered until the owner approves a provider.
// Never return the code in an API response.
router.post('/request-otp', requireAuth, async (req, res, next) => { try { const code = String(Math.floor(100000 + Math.random() * 900000)); const otpHash = await bcrypt.hash(code, 10); await User.updateOne({ _id: req.auth.sub }, { otpHash, otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) }); res.json({ message: 'OTP requested. Delivery requires an approved SMS/email provider, which is not configured yet.' }); } catch (e) { next(e); } });
router.post('/verify-otp', requireAuth, async (req, res, next) => { try { const user = await User.findById(req.auth.sub).select('+otpHash'); if (!user || !user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) return res.status(400).json({ message: 'OTP expired or not requested' }); const ok = await bcrypt.compare(String(req.body.code || ''), user.otpHash); if (!ok) return res.status(400).json({ message: 'Incorrect OTP' }); user.phoneVerified = true; user.otpHash = undefined; user.otpExpiresAt = null; await user.save(); res.json({ message: 'Phone verified' }); } catch (e) { next(e); } });
router.patch('/me', requireAuth, async (req, res, next) => { try { const allowed = {}; if (req.body.phone) allowed.phone = req.body.phone; if (req.body.privacy) allowed.privacy = req.body.privacy; if (req.body.partnerPreferences) allowed.partnerPreferences = req.body.partnerPreferences; const user = await User.findByIdAndUpdate(req.auth.sub, allowed, { new: true }).select('fullName email role accountStatus emailVerified phone phoneVerified privacy partnerPreferences'); res.json({ user }); } catch (e) { next(e); } });
router.delete('/me', requireAuth, async (req, res, next) => { try { await User.findByIdAndDelete(req.auth.sub); res.clearCookie('sm_session', { httpOnly: true, sameSite: 'strict', path: '/' }); res.json({ message: 'Account deleted' }); } catch (e) { next(e); } });
router.post('/logout', (_req, res) => { res.clearCookie('sm_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' }); res.json({ message: 'Logged out' }); });
export default router;
