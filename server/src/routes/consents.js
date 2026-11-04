import express from 'express';
import Consent from '../models/Consent.js';
import AuditLog from '../models/AuditLog.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = express.Router();
// Only operator roles record consent. Member-to-member direct sharing is never allowed by this route.
router.get('/mine', requireAuth, async (req, res, next) => { try { const rows = await Consent.find({ sharedWithUser: req.auth.sub }).sort('-createdAt'); res.json({ consents: rows }); } catch (e) { next(e); } });
router.get('/', requireAuth, allowRoles('matchmaker','admin','owner'), async (req, res, next) => { try { const rows = await Consent.find().sort('-createdAt').limit(100).populate('biodata'); res.json({ consents: rows }); } catch (e) { next(e); } });
router.post('/', requireAuth, allowRoles('matchmaker','admin','owner'), async (req, res, next) => { try { const doc = await Consent.create({ ...req.body, grantedBy: req.auth.sub }); await AuditLog.create({ actor: req.auth.sub, action: 'consent_granted', targetType: 'Biodata', targetId: String(req.body.biodata), detail: `Scope: ${req.body.scope || 'biodata'}` }); res.status(201).json({ consent: doc }); } catch (e) { next(e); } });
router.patch('/:id/revoke', requireAuth, allowRoles('matchmaker','admin','owner'), async (req, res, next) => { try { const doc = await Consent.findByIdAndUpdate(req.params.id, { status: 'revoked' }, { new: true }); if (!doc) return res.status(404).json({ message: 'Not found' }); await AuditLog.create({ actor: req.auth.sub, action: 'consent_revoked', targetType: 'Consent', targetId: req.params.id }); res.json({ consent: doc }); } catch (e) { next(e); } });
export default router;
