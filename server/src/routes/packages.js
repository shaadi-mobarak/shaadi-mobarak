import express from 'express';
import Package, { DEFAULT_PACKAGES } from '../models/Package.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
const router = express.Router();
async function ensureSeeded() {
  // Seed only on an empty collection: an admin may rename or deactivate a
  // package, and a per-name upsert on every request would silently resurrect
  // it. The unique index on Package.name (plus swallowing 11000 here) is what
  // guards the concurrent-first-request double-seed, not a re-upsert.
  if ((await Package.countDocuments()) !== 0) {
    // Royal was added to DEFAULT_PACKAGES after the live DB was seeded, and
    // the seeder above only runs on an empty collection. Upsert Royal only:
    // never touch any existing package (live prices may have been changed
    // deliberately by the owner).
    const royal = DEFAULT_PACKAGES.find((p) => p.name === 'Royal');
    if (royal) { try { await Package.updateOne({ name: 'Royal' }, { $setOnInsert: royal }, { upsert: true }); } catch (e) { if (e.code !== 11000) throw e; } }
    return;
  }
  try { await Package.insertMany(DEFAULT_PACKAGES, { ordered: false }); }
  catch (e) { if (e.code !== 11000) throw e; }
}
router.get('/', async (_req, res, next) => { try { await ensureSeeded(); const packages = await Package.find({ isActive: true }).sort('sortOrder'); res.json({ packages }); } catch (e) { next(e); } });
const PKG_FIELDS = ['name', 'priceBDT', 'durationDays', 'proposals', 'meetings', 'features', 'isActive', 'sortOrder'];
function pickPkg(body) { const out = {}; if (!body || typeof body !== 'object') return out; for (const k of PKG_FIELDS) if (body[k] !== undefined) out[k] = body[k]; return out; }
router.post('/', requireAuth, allowRoles('admin', 'owner'), async (req, res, next) => { try { const p = await Package.create(pickPkg(req.body)); res.status(201).json({ package: p }); } catch (e) { next(e); } });
router.patch('/:id', requireAuth, allowRoles('admin', 'owner'), async (req, res, next) => { try { const p = await Package.findByIdAndUpdate(req.params.id, pickPkg(req.body), { new: true, runValidators: true }); if (!p) return res.status(404).json({ message: 'Package not found' }); res.json({ package: p }); } catch (e) { next(e); } });
router.delete('/:id', requireAuth, allowRoles('admin', 'owner'), async (req, res, next) => { try { const p = await Package.findByIdAndDelete(req.params.id); if (!p) return res.status(404).json({ message: 'Package not found' }); res.json({ message: 'Deleted' }); } catch (e) { next(e); } });
export default router;
