import express from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import Biodata from '../models/Biodata.js';
import { storage } from '../utils/storage.js';
const router = express.Router();
// Uploads are private by design: files live outside any public folder and are
// served only through the authenticated download route below. Storage goes
// through the storage adapter (local disk today; see utils/storage.js).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => { const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype); cb(ok ? null : new Error('Only JPG, PNG or WebP images are allowed'), ok); } });
router.post('/', requireAuth, upload.single('photo'), async (req, res, next) => { try { if (!req.file) return res.status(400).json({ message: 'No photo uploaded' }); const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname).toLowerCase()}`; if (req.body.biodataId) { const bio = await Biodata.findById(req.body.biodataId); if (!bio) return res.status(404).json({ message: 'Biodata not found' }); const isOperator = ['matchmaker', 'admin', 'owner'].includes(req.auth.role); if (!isOperator && String(bio.ownerUser) !== String(req.auth.sub)) return res.status(403).json({ message: 'Access denied' }); await storage.save(req.file.buffer, filename); await Biodata.updateOne({ _id: req.body.biodataId }, { $push: { photos: filename } }); } else { await storage.save(req.file.buffer, filename); } res.status(201).json({ filename }); } catch (e) { next(e); } });
// Only the owner, or an operator, may download a private photo.
router.get('/:filename', requireAuth, async (req, res, next) => { try { const file = path.basename(req.params.filename); if (!['matchmaker', 'admin', 'owner'].includes(req.auth.role)) { const own = await Biodata.exists({ photos: file, ownerUser: req.auth.sub }); if (!own) return res.status(403).json({ message: 'Access denied' }); } if (!(await storage.exists(file))) return res.status(404).json({ message: 'Not found' }); res.sendFile(storage.filePath(file)); } catch (e) { next(e); } });
export default router;
