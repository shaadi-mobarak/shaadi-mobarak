import mongoose from 'mongoose';
// Prices are editable from the admin panel — never hardcode them in the client alone.
// Draft prices agreed with Feri (2026-11-04); the client confirms the final prices.
export const DEFAULT_PACKAGES = [
  { name: 'Free', priceBDT: 0, durationDays: 30, proposals: 2, meetings: 0, features: ['রেজিস্ট্রেশন', 'বায়োডাটা জমা', 'টিজার ব্রাউজ', 'সীমিত আগ্রহ'], sortOrder: 1 },
  { name: 'Silver', priceBDT: 2000, durationDays: 90, proposals: 10, meetings: 2, features: ['পরিচালকের মাধ্যমে ১০টি প্রস্তাব', 'সীমিত বায়োডাটা শেয়ার'], sortOrder: 2 },
  { name: 'Gold', priceBDT: 5000, durationDays: 180, proposals: 25, meetings: 5, features: ['২৫টি প্রস্তাব', 'প্রায়োরিটি লিস্টিং', 'বায়োডাটা PDF', '৫টি মিটিং'], sortOrder: 3 },
  { name: 'Platinum', priceBDT: 6000, durationDays: 365, proposals: 50, meetings: 10, features: ['৫০টি প্রস্তাব', 'বেশি মিটিং ব্যবস্থা', 'অগ্রাধিকার সাপোর্ট'], sortOrder: 4 },
  { name: 'Elite Assisted', priceBDT: 15000, durationDays: 365, proposals: 100, meetings: 20, features: ['পার্সোনাল ম্যাচমেকার', 'অফলাইন সাপোর্ট', 'সর্বোচ্চ অগ্রাধিকার'], sortOrder: 5 },
  { name: 'Royal', priceBDT: 20000, durationDays: 365, proposals: 150, meetings: 30, features: ['ভিআইপি পার্সোনাল ম্যাচমেকার', 'অফলাইন সাপোর্ট', 'সর্বোচ্চ অগ্রাধিকার', 'ফ্যামিলি মিটিং ব্যবস্থা'], sortOrder: 6 },
];
const packageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  priceBDT: { type: Number, required: true, min: 0 },
  durationDays: { type: Number, required: true, min: 1 },
  proposals: { type: Number, default: 0, min: 0 },
  meetings: { type: Number, default: 0, min: 0 },
  features: { type: [String], default: [] },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });
export default mongoose.model('Package', packageSchema);
