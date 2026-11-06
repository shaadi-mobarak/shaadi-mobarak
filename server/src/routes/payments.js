import express from 'express';
import Payment from '../models/Payment.js';
import Package from '../models/Package.js';
import Membership from '../models/Membership.js';
import Notification from '../models/Notification.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { getGateways } from '../utils/gateways.js';
const router = express.Router();
const PAY_METHODS = ['bKash', 'Nagad', 'Rocket', 'Card', 'Manual', 'SSLCommerz'];
const PAY_STATUSES = ['pending', 'approved', 'rejected', 'refunded'];
// Public: which payment gateways are actually enabled (credentials present).
// With no merchant credentials every gateway reports enabled:false.
router.get('/gateways', (_req, res) => { res.json({ gateways: getGateways() }); });
router.post('/', requireAuth, async (req, res, next) => { try { if (req.body.method && !PAY_METHODS.includes(req.body.method)) return res.status(400).json({ message: 'Invalid payment method' }); const pkg = await Package.findById(req.body.package); if (!pkg) return res.status(404).json({ message: 'Package not found' }); if (!pkg.isActive) return res.status(400).json({ message: 'This package is not currently available' }); const doc = await Payment.create({ user: req.auth.sub, package: pkg._id, amountBDT: pkg.priceBDT, method: req.body.method || 'Manual', transactionId: req.body.transactionId ? String(req.body.transactionId).slice(0, 100) : undefined, receipt: req.body.receipt ? String(req.body.receipt).slice(0, 500) : undefined }); res.status(201).json({ payment: doc, note: 'Payment is pending admin approval. Package activates only after approval.' }); } catch (e) { next(e); } });
router.get('/', requireAuth, allowRoles('admin', 'owner'), async (_req, res, next) => { try { const rows = await Payment.find().sort('-createdAt').limit(100); res.json({ payments: rows }); } catch (e) { next(e); } });
router.get('/mine', requireAuth, async (req, res, next) => { try { const rows = await Payment.find({ user: req.auth.sub }).populate('package').sort('-createdAt'); res.json({ payments: rows }); } catch (e) { next(e); } });
router.patch('/:id', requireAuth, allowRoles('admin', 'owner'), async (req, res, next) => { try { const doc = await Payment.findById(req.params.id).populate('package'); if (!doc) return res.status(404).json({ message: 'Payment not found' }); const wasApproved = doc.status === 'approved'; if (req.body.status !== undefined) { if (!PAY_STATUSES.includes(req.body.status)) return res.status(400).json({ message: 'Invalid payment status' }); doc.status = req.body.status; } if (req.body.refundNote !== undefined) doc.refundNote = String(req.body.refundNote).slice(0, 1000); await doc.save(); if (doc.status === 'approved' && !wasApproved && doc.package) { const existing = await Membership.findOne({ payment: doc._id }); if (!existing) { const startsAt = new Date(); const endsAt = new Date(startsAt.getTime() + (doc.package.durationDays || 30) * 86400000); await Membership.create({ user: doc.user, package: doc.package._id, payment: doc._id, startsAt, endsAt }); await Notification.create({ user: doc.user, title: 'Payment approved', body: `Your ${doc.package.name} membership is now active.`, kind: 'payment' }); } }
  // If an approved payment is later rejected or refunded, its membership must
  // not stay active.
  if (wasApproved && (doc.status === 'refunded' || doc.status === 'rejected')) { await Membership.updateMany({ payment: doc._id, status: 'active' }, { status: 'cancelled' }); }
  res.json({ payment: doc }); } catch (e) { next(e); } });
export default router;
