import express from 'express';
import Content from '../models/Content.js';
import AuditLog from '../models/AuditLog.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = express.Router();
router.get('/', async (req, res, next) => { try { const q = { isActive: true }; if (req.query.type) q.type = req.query.type; const rows = await Content.find(q).sort('sortOrder'); res.json({ items: rows }); } catch (e) { next(e); } });
// Admin list: every content item, including inactive ones, newest first.
router.get('/all', requireAuth, allowRoles('admin', 'owner'), async (_req, res, next) => { try { const rows = await Content.find().sort('-createdAt'); res.json({ items: rows }); } catch (e) { next(e); } });
router.get('/slug/:slug', async (req, res, next) => { try { const doc = await Content.findOne({ slug: req.params.slug, isActive: true }); if (!doc) return res.status(404).json({ message: 'Not found' }); res.json({ item: doc }); } catch (e) { next(e); } });
router.post('/', requireAuth, allowRoles('admin', 'owner'), async (req, res, next) => { try { const doc = await Content.create(req.body); await AuditLog.create({ actor: req.auth.sub, action: 'content_created', targetType: 'Content', targetId: String(doc._id), detail: `${doc.type}: ${doc.title}` }); res.status(201).json({ item: doc }); } catch (e) { next(e); } });
router.patch('/:id', requireAuth, allowRoles('admin', 'owner'), async (req, res, next) => { try { const doc = await Content.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!doc) return res.status(404).json({ message: 'Not found' }); await AuditLog.create({ actor: req.auth.sub, action: 'content_updated', targetType: 'Content', targetId: req.params.id, detail: `${doc.type}: ${doc.title}` }); res.json({ item: doc }); } catch (e) { next(e); } });
router.delete('/:id', requireAuth, allowRoles('admin', 'owner'), async (req, res, next) => { try { const doc = await Content.findById(req.params.id); if (!doc) return res.status(404).json({ message: 'Not found' }); await Content.findByIdAndDelete(req.params.id); await AuditLog.create({ actor: req.auth.sub, action: 'content_deleted', targetType: 'Content', targetId: req.params.id, detail: `${doc.type}: ${doc.title}` }); res.json({ message: 'Deleted' }); } catch (e) { next(e); } });
export default router;
