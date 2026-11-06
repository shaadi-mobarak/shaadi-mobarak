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
const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
// Verify the file really is an image by its magic bytes — the multipart
// Content-Type header is client-supplied and cannot be trusted on its own.
function sniffImage(buffer, mimetype) {
  if (mimetype === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimetype === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimetype === 'image/webp') return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => { const ok = Object.prototype.hasOwnProperty.call(MIME_EXT, file.mimetype); cb(ok ? null : new Error('Only JPG, PNG or WebP images are allowed'), ok); } });
// Multer errors (too large / wrong type) are answered here with 400/413 instead
// of falling through to the generic 500 handler.
function handleUpload(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'File is too large (max 5 MB)' });
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    next();
  });
}
router.post('/', requireAuth, handleUpload, async (req, res, next) => { try { if (!req.file) return res.status(400).json({ message: 'No photo uploaded' }); if (!sniffImage(req.file.buffer, req.file.mimetype)) return res.status(400).json({ message: 'File is not a valid image' }); if (!req.body.biodataId) return res.status(400).json({ message: 'A photo must belong to a biodata (biodataId is required)' }); const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${MIME_EXT[req.file.mimetype]}`; const bio = await Biodata.findById(req.body.biodataId); if (!bio) return res.status(404).json({ message: 'Biodata not found' }); const isOperator = ['matchmaker', 'admin', 'owner'].includes(req.auth.role); if (!isOperator && String(bio.ownerUser) !== String(req.auth.sub)) return res.status(403).json({ message: 'Access denied' }); await storage.save(req.file.buffer, filename); await Biodata.updateOne({ _id: req.body.biodataId }, { $push: { photos: filename } }); res.status(201).json({ filename }); } catch (e) { next(e); } });
// Only the owner, or an operator, may download a private photo.
router.get('/:filename', requireAuth, async (req, res, next) => { try { const file = path.basename(req.params.filename); if (!['matchmaker', 'admin', 'owner'].includes(req.auth.role)) { const own = await Biodata.exists({ photos: file, ownerUser: req.auth.sub }); if (!own) return res.status(403).json({ message: 'Access denied' }); } if (!(await storage.exists(file))) return res.status(404).json({ message: 'Not found' }); res.sendFile(storage.filePath(file)); } catch (e) { next(e); } });
export default router;
