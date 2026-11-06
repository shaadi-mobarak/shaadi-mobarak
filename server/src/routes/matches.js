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
    // Only plain string values from the query are accepted; objects/arrays
    // (e.g. ?profileType[$ne]=x) are rejected so Mongo operators can never
    // be injected through the public search.
    for (const k of ['profileType', 'district', 'profession', 'education', 'maritalStatus', 'religion', 'minAge', 'maxAge', 'minHeight', 'maxHeight']) { if (req.query[k] !== undefined && typeof req.query[k] !== 'string') return res.status(400).json({ message: 'Invalid search parameter' }); }
    const str = (v) => (typeof v === 'string' ? v : null);
    const num = (v) => { const n = Number(v); return typeof v === 'string' && Number.isFinite(n) ? n : null; };
    const profileType = str(req.query.profileType);
    if (profileType) { if (!['bride', 'groom'].includes(profileType)) return res.status(400).json({ message: 'Invalid profileType' }); q.profileType = profileType; }
    const district = str(req.query.district);
    if (district) q.district = new RegExp(escapeRegExp(district), 'i');
    const profession = str(req.query.profession);
    if (profession) q.profession = new RegExp(escapeRegExp(profession), 'i');
    const education = str(req.query.education);
    if (education) q.education = new RegExp(escapeRegExp(education), 'i');
    const maritalStatus = str(req.query.maritalStatus);
    if (maritalStatus) { if (!['unmarried', 'divorced', 'widowed'].includes(maritalStatus)) return res.status(400).json({ message: 'Invalid maritalStatus' }); q.maritalStatus = maritalStatus; }
    const religion = str(req.query.religion);
    if (religion) q.religion = new RegExp(`^${escapeRegExp(religion)}$`, 'i');
    const minAge = num(req.query.minAge); const maxAge = num(req.query.maxAge);
    if (minAge !== null || maxAge !== null) { q.age = {}; if (minAge !== null) q.age.$gte = minAge; if (maxAge !== null) q.age.$lte = maxAge; }
    const minHeight = num(req.query.minHeight); const maxHeight = num(req.query.maxHeight);
    if (minHeight !== null || maxHeight !== null) { q.heightCm = {}; if (minHeight !== null) q.heightCm.$gte = minHeight; if (maxHeight !== null) q.heightCm.$lte = maxHeight; }
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
