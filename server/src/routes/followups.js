import express from 'express';
import FollowUp from '../models/FollowUp.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = express.Router();
router.use(requireAuth, allowRoles('matchmaker','admin','owner'));
router.get('/', async (req, res, next) => { try { const rows = await FollowUp.find().sort('-createdAt').limit(200); res.json({ followups: rows }); } catch (e) { next(e); } });
router.post('/', async (req, res, next) => { try { const doc = await FollowUp.create({ ...req.body, matchmaker: req.auth.sub }); res.status(201).json({ followup: doc }); } catch (e) { next(e); } });
router.patch('/:id', async (req, res, next) => { try { const doc = await FollowUp.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!doc) return res.status(404).json({ message: 'Not found' }); res.json({ followup: doc }); } catch (e) { next(e); } });
export default router;
