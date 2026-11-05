import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['member', 'matchmaker', 'admin', 'owner'], default: 'member' },
  accountStatus: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
  phone: { type: String, trim: true, maxlength: 20 },
  phoneVerified: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  otpHash: { type: String, select: false },
  otpExpiresAt: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
  otpRequestedAt: { type: Date, default: null },
  privacy: { showPhotoTo: { type: String, enum: ['operator_only','approved_families'], default: 'operator_only' }, showContactTo: { type: String, enum: ['operator_only','approved_families'], default: 'operator_only' } },
  partnerPreferences: { minAge: Number, maxAge: Number, district: String, profession: String, religion: String, education: String }
}, { timestamps: true, versionKey: false });
export default mongoose.model('User', userSchema);
