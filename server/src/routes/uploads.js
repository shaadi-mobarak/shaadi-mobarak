import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import Biodata from '../models/Biodata.js';
const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'uploads', 'private');
fs.mkdirSync(dir, { recursive: true });
const storage = multer.diskStorage({ destination: dir, filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname).toLowerCase()}`) });
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => { const ok = ['image/jpeg','image/png','image/webp'].includes(file.mimetype); cb(ok ? null : new Error('Only JPG, PNG or WebP images are allowed'), ok); } });
// Upload is private by design: files live outside any public folder.
router.post('/', requireAuth, upload.single('photo'), async (req, res, next) => { try { if (!req.file) return res.status(400).json({ message: 'No photo uploaded' }); if (req.body.biodataId) await Biodata.updateOne({ _id: req.body.biodataId }, { $push: { photos: req.file.filename } }); res.status(201).json({ filename: req.file.filename }); } catch (e) { next(e); } });
// Only the owner, or an operator, may download a private photo.
router.get('/:filename', requireAuth, async (req, res, next) => { try { const file = path.basename(req.params.filename); if (!['matchmaker','admin','owner'].includes(req.auth.role)) { const own = await Biodata.exists({ photos: file, ownerUser: req.auth.sub }); if (!own) return res.status(403).json({ message: 'Access denied' }); } const full = path.join(dir, file); if (!fs.existsSync(full)) return res.status(404).json({ message: 'Not found' }); res.sendFile(full); } catch (e) { next(e); } });
export default router;
