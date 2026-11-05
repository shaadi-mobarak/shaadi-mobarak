import express from 'express';
import InterestRequest from '../models/InterestRequest.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = express.Router();
// Member sends interest TO THE OPERATOR, not to the other party.
router.post('/', requireAuth, async (req, res) => { const doc = await InterestRequest.create({ fromUser: req.auth.sub, targetBiodata: req.body.targetBiodata, message: req.body.message }); res.status(201).json({ interest: doc, note: 'Your interest has gone to the operator. No direct contact will be shared.' }); });
router.get('/mine', requireAuth, async (req, res, next) => { try { const rows = await InterestRequest.find({ fromUser: req.auth.sub }).sort('-createdAt').populate('targetBiodata', 'profileType age profession district education status'); res.json({ interests: rows }); } catch (e) { next(e); } });
router.get('/', requireAuth, allowRoles('matchmaker', 'admin', 'owner'), async (_req, res) => { const rows = await InterestRequest.find().sort('-createdAt').populate('fromUser', 'fullName email').populate('targetBiodata', 'profileType age profession district education status'); res.json({ interests: rows }); });
router.patch('/:id', requireAuth, allowRoles('matchmaker', 'admin', 'owner'), async (req, res) => { const allowed = {}; if (['pending','forwarded','approved','rejected','meeting_scheduled'].includes(req.body.status)) allowed.status = req.body.status; if (req.body.operatorNote !== undefined) allowed.operatorNote = req.body.operatorNote; if (req.body.meetingDate !== undefined) allowed.meetingDate = req.body.meetingDate; const doc = await InterestRequest.findByIdAndUpdate(req.params.id, allowed, { new: true }); if (!doc) return res.status(404).json({ message: 'Interest not found' }); res.json({ interest: doc }); });
export default router;
