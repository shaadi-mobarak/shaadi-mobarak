import express from 'express';
import Shortlist from '../models/Shortlist.js';
import Biodata from '../models/Biodata.js';
import { requireAuth } from '../middleware/auth.js';
const router = express.Router();
router.get('/', requireAuth, async (req, res, next) => { try { const rows = await Shortlist.find({ user: req.auth.sub }).populate('biodata'); res.json({ shortlists: rows.map(r => ({ id: r._id, biodata: r.biodata ? r.biodata.toTeaser() : null, note: r.note })) }); } catch (e) { next(e); } });
router.post('/', requireAuth, async (req, res, next) => { try { const bio = await Biodata.findById(req.body.biodata); if (!bio) return res.status(404).json({ message: 'Biodata not found' }); if (bio.status !== 'published') return res.status(400).json({ message: 'Only published biodata can be shortlisted' }); const doc = await Shortlist.create({ user: req.auth.sub, biodata: req.body.biodata, note: req.body.note ? String(req.body.note).slice(0, 500) : '' }); res.status(201).json({ shortlist: doc }); } catch (e) { if (e.code === 11000) return res.status(409).json({ message: 'Already shortlisted' }); next(e); } });
router.delete('/:id', requireAuth, async (req, res, next) => { try { const result = await Shortlist.deleteOne({ _id: req.params.id, user: req.auth.sub }); if (result.deletedCount === 0) return res.status(404).json({ message: 'Shortlist entry not found' }); res.json({ message: 'Removed from shortlist' }); } catch (e) { next(e); } });
export default router;
