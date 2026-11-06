import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import packageRoutes from './routes/packages.js';
import biodataRoutes from './routes/biodata.js';
import interestRoutes from './routes/interests.js';
import paymentRoutes from './routes/payments.js';
import matchesRoutes from './routes/matches.js';
import shortlistsRoutes from './routes/shortlists.js';
import notificationsRoutes from './routes/notifications.js';
import supportRoutes from './routes/support.js';
import contentRoutes from './routes/content.js';
import consentsRoutes from './routes/consents.js';
import adminRoutes from './routes/admin.js';
import membershipsRoutes from './routes/memberships.js';
import followupsRoutes from './routes/followups.js';
import uploadsRoutes from './routes/uploads.js';
import SiteSetting from './models/SiteSetting.js';
import { getStorageDriver } from './utils/storage.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const app = express();
app.set('trust proxy', 1); // Render terminates TLS behind a proxy; rate-limit needs the real client IP.
app.disable('x-powered-by');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
// Helmet MUST run before the static middleware, or static responses (the
// whole site) get no security headers and leak x-powered-by.
// Hashed Vite assets under /assets/* are immutable: cache them for a year.
// index.html keeps max-age=0 so a new deploy is picked up immediately.
app.use(helmet());
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { maxAge: 0, setHeaders: (res, filePath) => { if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); } }));
  app.get('*', (req, res, next) => { if (req.path.startsWith('/api/')) return next(); res.sendFile(path.join(clientDist, 'index.html')); });
}
const supportRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
// Auth rate limits live on the individual routes in routes/auth.js (strict
// 30/15min on login/register/OTP only; generous 300/15min on session reads).
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
// Public site status (always reachable, so the frontend can show a maintenance banner).
app.get('/api/site-status', async (_req, res) => { try { const s = await SiteSetting.findOne({ key: 'maintenanceMode' }); res.json({ maintenance: s ? String(s.value).trim().toLowerCase() === 'true' : false, storage: { driver: getStorageDriver(), persistent: false } }); } catch { res.json({ maintenance: false, storage: { driver: 'local', persistent: false } }); } });
// Maintenance mode (owner setting key "maintenanceMode" = "true"):
// public API calls return 503; health, site-status, auth and admin stay reachable
// so the owner can log in and switch it off again. Fails open if the DB is unreachable.
app.use('/api', async (req, res, next) => {
  if (req.path.startsWith('/admin') || req.path.startsWith('/auth')) return next();
  try { const s = await SiteSetting.findOne({ key: 'maintenanceMode' }); if (s && String(s.value).trim().toLowerCase() === 'true') return res.status(503).json({ message: 'The website is under maintenance. Please try again later.', maintenance: true }); } catch { /* fail open */ }
  next();
});
app.use('/api/packages', packageRoutes);
app.use('/api/biodata', biodataRoutes);
app.use('/api/interests', interestRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/shortlists', shortlistsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/support', supportRateLimit, supportRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/consents', consentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/memberships', membershipsRoutes);
app.use('/api/followups', followupsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, _req, res, _next) => {
  // Map common errors to proper client statuses instead of leaking a 500/stack.
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON in request body' });
  if (err && err.type === 'entity.too.large') return res.status(413).json({ message: 'অনুরোধটি অনেক বড় (সর্বোচ্চ 100 KB) / Request is too large (max 100 KB)' });
  if (err && err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
  if (err && err.name === 'ValidationError') return res.status(400).json({ message: 'Please check the submitted information' });
  if (err && err.code === 11000) return res.status(409).json({ message: 'Duplicate record' });
  if (err && err.name === 'MulterError') return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5 MB)' : 'Upload failed' });
  console.error(err);
  res.status(500).json({ message: 'An unexpected server error occurred' });
});
export default app;
