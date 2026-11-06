import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import User from '../models/User.js';
import Biodata from '../models/Biodata.js';
import Shortlist from '../models/Shortlist.js';
import InterestRequest from '../models/InterestRequest.js';
import { requireAuth } from '../middleware/auth.js';
import { isOtpConfigured, otpChannel, sendOtpCode } from '../utils/otpProvider.js';
import rateLimit from 'express-rate-limit';
const otpRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many OTP requests. Please try again later.' } });
// Brute-force protection: ONLY login, register and OTP attempts share this
// strict bucket (30 / 15 min). Session reads must never share it — a
// dashboard visit fires /auth/me on every mount, and sharing the bucket
// locked real users (and fresh logins) out after ~30 requests.
// Session reads (login checks, OTP status) get a generous bucket of their own.
const strictAuthLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many requests. Please try again later.' } });
const sessionReadLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many requests. Please try again later.' } });
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_MS = 60 * 1000;
const router = Router();
// OTP: 6-digit code, hashed, 10-minute expiry, max 5 attempts, 60s cooldown.
// Without a configured provider the request returns 503 and no code is created
// or delivered. The code is NEVER returned in any API response.
async function requestOtp(req, res, next) {
  try {
    if (!isOtpConfigured()) return res.status(503).json({ message: 'OTP delivery is not configured. An approved SMS/email provider is required.' });
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(401).json({ message: 'Account not found' });
    if (user.otpRequestedAt && Date.now() - new Date(user.otpRequestedAt).getTime() < OTP_COOLDOWN_MS) return res.status(429).json({ message: 'Please wait a minute before requesting another OTP.' });
    const code = String(crypto.randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(code, 10);
    await User.updateOne({ _id: req.auth.sub }, { otpHash, otpExpiresAt: new Date(Date.now() + OTP_TTL_MS), otpAttempts: 0, otpRequestedAt: new Date() });
    try { await sendOtpCode({ to: user.email, code }); }
    catch (e) { await User.updateOne({ _id: req.auth.sub }, { otpHash: undefined, otpExpiresAt: null }); return res.status(503).json({ message: 'OTP could not be delivered. Please try again later.' }); }
    res.json({ message: 'OTP sent to your email. It expires in 10 minutes.' });
  } catch (e) { next(e); }
}
async function verifyOtp(req, res, next) {
  try {
    if (typeof req.body.code !== 'string' || !/^\d{6}$/.test(req.body.code)) return res.status(400).json({ message: 'Enter the 6-digit OTP code' });
    const user = await User.findById(req.auth.sub).select('+otpHash');
    if (!user || !user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) return res.status(400).json({ message: 'OTP expired or not requested' });
    if ((user.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) { await User.updateOne({ _id: req.auth.sub }, { otpHash: undefined, otpExpiresAt: null, otpAttempts: 0 }); return res.status(400).json({ message: 'Too many wrong attempts. Please request a new OTP.' }); }
    const ok = await bcrypt.compare(String(req.body.code || ''), user.otpHash);
    if (!ok) { await User.updateOne({ _id: req.auth.sub }, { $inc: { otpAttempts: 1 } }); return res.status(400).json({ message: 'Incorrect OTP' }); }
    user.phoneVerified = true; user.otpHash = undefined; user.otpExpiresAt = null; user.otpAttempts = 0; user.otpRequestedAt = null; await user.save();
    res.json({ message: 'Phone verified' });
  } catch (e) { next(e); }
}
router.post('/otp/request', strictAuthLimit, requireAuth, otpRateLimit, requestOtp);
router.post('/otp/verify', strictAuthLimit, requireAuth, verifyOtp);
// Legacy endpoints (kept so older clients keep working) — same handlers.
router.post('/request-otp', strictAuthLimit, requireAuth, otpRateLimit, requestOtp);
router.post('/verify-otp', strictAuthLimit, requireAuth, verifyOtp);
// Public: does OTP delivery work at all? No secrets are exposed here.
router.get('/otp-status', sessionReadLimit, (_req, res) => { res.json({ configured: isOtpConfigured(), channel: otpChannel() }); });
const registerSchema = z.object({ fullName: z.string().trim().min(2).max(100), email: z.string().trim().email().max(160), password: z.string().min(10).max(72) });
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(72) });
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 24 * 60 * 60 * 1000 };
function issueSession(user, res) {
  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
  res.cookie('sm_session', token, cookieOptions);
}
router.post('/register', strictAuthLimit, async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Please check the submitted information', errors: parsed.error.flatten() });
    const { fullName, email, password } = parsed.data;
    if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with this email already exists' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName, email, passwordHash });
    // New accounts remain pending until verification/approval is implemented.
    res.status(201).json({ message: 'Registration received. Account activation is pending.', user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, accountStatus: user.accountStatus } });
  } catch (e) { if (e.code === 11000) return res.status(409).json({ message: 'An account with this email already exists' }); next(e); }
});
router.post('/login', strictAuthLimit, async (req, res, next) => {
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
router.get('/me', sessionReadLimit, requireAuth, async (req, res, next) => {
  try { const user = await User.findById(req.auth.sub).select('fullName email role accountStatus emailVerified phone phoneVerified privacy partnerPreferences'); if (!user) return res.status(401).json({ message: 'Account not found' }); res.json({ user }); }
  catch (e) { next(e); }
});
const mePatchSchema = z.object({
  phone: z.string().trim().max(20).optional(),
  privacy: z.object({ showPhotoTo: z.enum(['operator_only', 'approved_families']).optional(), showContactTo: z.enum(['operator_only', 'approved_families']).optional() }).optional(),
  partnerPreferences: z.object({ minAge: z.number().int().min(18).max(100).optional(), maxAge: z.number().int().min(18).max(100).optional(), district: z.string().trim().max(100).optional(), profession: z.string().trim().max(100).optional(), religion: z.string().trim().max(50).optional(), education: z.string().trim().max(200).optional() }).optional(),
}).strict();
router.patch('/me', sessionReadLimit, requireAuth, async (req, res, next) => { try { const parsed = mePatchSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ message: 'Please check the submitted information', errors: parsed.error.flatten() }); const user = await User.findByIdAndUpdate(req.auth.sub, parsed.data, { new: true, runValidators: true }).select('fullName email role accountStatus emailVerified phone phoneVerified privacy partnerPreferences'); res.json({ user }); } catch (e) { next(e); } });
router.delete('/me', sessionReadLimit, requireAuth, async (req, res, next) => { try { const me = await User.findById(req.auth.sub); if (!me) return res.status(401).json({ message: 'Account not found' }); if (me.role === 'owner') return res.status(403).json({ message: 'The owner account cannot be deleted from here' }); await Promise.all([Biodata.deleteMany({ ownerUser: req.auth.sub }), Shortlist.deleteMany({ user: req.auth.sub }), InterestRequest.deleteMany({ fromUser: req.auth.sub })]); await User.findByIdAndDelete(req.auth.sub); res.clearCookie('sm_session', { httpOnly: true, sameSite: 'strict', path: '/' }); res.json({ message: 'Account deleted' }); } catch (e) { next(e); } });
router.post('/logout', sessionReadLimit, (_req, res) => { res.clearCookie('sm_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' }); res.json({ message: 'Logged out' }); });
export default router;
