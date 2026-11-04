import express from 'express';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';
const router = express.Router();
router.get('/', requireAuth, async (req, res, next) => { try { const rows = await Notification.find({ user: req.auth.sub }).sort('-createdAt').limit(50); res.json({ notifications: rows }); } catch (e) { next(e); } });
router.patch('/:id/read', requireAuth, async (req, res, next) => { try { await Notification.updateOne({ _id: req.params.id, user: req.auth.sub }, { read: true }); res.json({ message: 'Marked as read' }); } catch (e) { next(e); } });
export default router;
