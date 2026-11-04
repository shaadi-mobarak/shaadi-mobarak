import express from 'express';
import Package, { DEFAULT_PACKAGES } from '../models/Package.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = express.Router();
async function ensureSeeded() {
  if ((await Package.countDocuments()) === 0) await Package.insertMany(DEFAULT_PACKAGES);
}
router.get('/', async (_req, res) => { await ensureSeeded(); const packages = await Package.find({ isActive: true }).sort('sortOrder'); res.json({ packages }); });
router.post('/', requireAuth, allowRoles('admin', 'owner'), async (req, res) => { const p = await Package.create(req.body); res.status(201).json({ package: p }); });
router.patch('/:id', requireAuth, allowRoles('admin', 'owner'), async (req, res) => { const p = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true }); if (!p) return res.status(404).json({ message: 'Package not found' }); res.json({ package: p }); });
router.delete('/:id', requireAuth, allowRoles('admin', 'owner'), async (req, res) => { await Package.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); });
export default router;
