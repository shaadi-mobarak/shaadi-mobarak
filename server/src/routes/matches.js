import express from 'express';
import Biodata from '../models/Biodata.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = express.Router();
// Public teaser search + matchmaking filters. Same-religion is a user-selected preference, not a default exclusion.
// Only published teasers are returned; no name, photo or contact.
const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
router.get('/search', async (req, res, next) => {
  try {
    const q = {};
    if (req.query.profileType) q.profileType = req.query.profileType;
    if (req.query.district) q.district = new RegExp(escapeRegExp(req.query.district), 'i');
    if (req.query.profession) q.profession = new RegExp(escapeRegExp(req.query.profession), 'i');
    if (req.query.education) q.education = new RegExp(escapeRegExp(req.query.education), 'i');
    if (req.query.maritalStatus) q.maritalStatus = req.query.maritalStatus;
    if (req.query.religion) q.religion = new RegExp(`^${escapeRegExp(req.query.religion)}$`, 'i');
    if (req.query.minAge || req.query.maxAge) { q.age = {}; if (req.query.minAge) q.age.$gte = Number(req.query.minAge); if (req.query.maxAge) q.age.$lte = Number(req.query.maxAge); }
    if (req.query.minHeight || req.query.maxHeight) { q.heightCm = {}; if (req.query.minHeight) q.heightCm.$gte = Number(req.query.minHeight); if (req.query.maxHeight) q.heightCm.$lte = Number(req.query.maxHeight); }
    q.status = 'published';
    const rows = await Biodata.find(q).sort('-createdAt').limit(50);
    res.json({ teasers: rows.map(r => r.toTeaser()) });
  } catch (e) { next(e); }
});
router.get('/teaser/:id', async (req, res, next) => { try { const doc = await Biodata.findOne({ _id: req.params.id, status: 'published' }); if (!doc) return res.status(404).json({ message: 'Teaser not found' }); res.json({ teaser: doc.toTeaser() }); } catch (e) { next(e); } });
// Member match suggestions: opposite profileType, same religion when the member selected it, age/district preference.
router.get('/suggestions', requireAuth, async (req, res, next) => {
  try {
    const mine = await Biodata.findOne({ ownerUser: req.auth.sub }).sort('-createdAt');
    const q = { status: 'published' };
    if (mine) { q.profileType = mine.profileType === 'bride' ? 'groom' : 'bride'; if (mine.religion) q.religion = mine.religion; }
    const rows = await Biodata.find(q).sort('-createdAt').limit(24);
    res.json({ teasers: rows.map(r => r.toTeaser()) });
  } catch (e) { next(e); }
});
export default router;
