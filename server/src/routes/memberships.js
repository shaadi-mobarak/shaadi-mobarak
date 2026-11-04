import express from 'express';
import Membership from '../models/Membership.js';
import { requireAuth } from '../middleware/auth.js';
const router = express.Router();
router.get('/mine', requireAuth, async (req, res, next) => { try { const rows = await Membership.find({ user: req.auth.sub }).populate('package').sort('-createdAt'); res.json({ memberships: rows }); } catch (e) { next(e); } });
export default router;
