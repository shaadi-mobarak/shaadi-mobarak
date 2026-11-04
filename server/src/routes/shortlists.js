import express from 'express';
import Shortlist from '../models/Shortlist.js';
import { requireAuth } from '../middleware/auth.js';
const router = express.Router();
router.get('/', requireAuth, async (req, res, next) => { try { const rows = await Shortlist.find({ user: req.auth.sub }).populate('biodata'); res.json({ shortlists: rows.map(r => ({ id: r._id, biodata: r.biodata ? r.biodata.toTeaser() : null, note: r.note })) }); } catch (e) { next(e); } });
router.post('/', requireAuth, async (req, res, next) => { try { const doc = await Shortlist.create({ user: req.auth.sub, biodata: req.body.biodata, note: req.body.note || '' }); res.status(201).json({ shortlist: doc }); } catch (e) { if (e.code === 11000) return res.status(409).json({ message: 'Already shortlisted' }); next(e); } });
router.delete('/:id', requireAuth, async (req, res, next) => { try { await Shortlist.deleteOne({ _id: req.params.id, user: req.auth.sub }); res.json({ message: 'Removed from shortlist' }); } catch (e) { next(e); } });
export default router;
