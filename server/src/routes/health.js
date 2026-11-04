import { Router } from 'express';
import mongoose from 'mongoose';
const router = Router();
router.get('/', (_req, res) => res.json({ status: 'ok', service: 'shaadi-mobarak-api', database: mongoose.connection.readyState === 1 ? 'connected' : 'not_connected' }));
export default router;
