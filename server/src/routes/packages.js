import express from 'express';
import Package, { DEFAULT_PACKAGES } from '../models/Package.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = express.Router();
async function ensureSeeded() {
  if ((await Package.countDocuments()) === 0) await Package.insertMany(DEFAULT_PACKAGES);
  // Royal was added to DEFAULT_PACKAGES after the live DB was seeded, and the
  // seeder above only runs on an empty collection. Upsert Royal only: never touch
  // any existing package (live prices may have been changed deliberately by the owner).
  const royal = DEFAULT_PACKAGES.find((p) => p.name === 'Royal');
  if (royal) await Package.updateOne({ name: 'Royal' }, { $setOnInsert: royal }, { upsert: true });
}
router.get('/', async (_req, res) => { await ensureSeeded(); const packages = await Package.find({ isActive: true }).sort('sortOrder'); res.json({ packages }); });
const PKG_FIELDS = ['name', 'priceBDT', 'durationDays', 'proposals', 'meetings', 'features', 'isActive', 'sortOrder'];
function pickPkg(body) { const out = {}; for (const k of PKG_FIELDS) if (body[k] !== undefined) out[k] = body[k]; return out; }
router.post('/', requireAuth, allowRoles('admin', 'owner'), async (req, res) => { const p = await Package.create(pickPkg(req.body)); res.status(201).json({ package: p }); });
router.patch('/:id', requireAuth, allowRoles('admin', 'owner'), async (req, res) => { const p = await Package.findByIdAndUpdate(req.params.id, pickPkg(req.body), { new: true, runValidators: true }); if (!p) return res.status(404).json({ message: 'Package not found' }); res.json({ package: p }); });
router.delete('/:id', requireAuth, allowRoles('admin', 'owner'), async (req, res) => { await Package.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted' }); });
export default router;
