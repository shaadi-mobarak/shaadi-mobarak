import mongoose from 'mongoose';
// Operator-mediated model: a biodata is NEVER published automatically.
// status: pending -> approved -> published. Only teaser fields are public.
// Full name, photos and contact are shown only by the operator, never directly.
const biodataSchema = new mongoose.Schema({
  ownerUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdByOperator: { type: Boolean, default: false },
  profileType: { type: String, enum: ['bride', 'groom'], required: true },
  age: { type: Number, min: 18, max: 100 },
  heightCm: { type: Number, min: 120, max: 220 },
  gender: { type: String, enum: ['female','male'], default: null },
  profession: { type: String, trim: true, maxlength: 100 },
  district: { type: String, trim: true, maxlength: 100 },
  education: { type: String, trim: true, maxlength: 200 },
  maritalStatus: { type: String, enum: ['unmarried', 'divorced', 'widowed'], default: 'unmarried' },
  religion: { type: String, trim: true, maxlength: 50 },
  familyInfo: { type: String, maxlength: 2000 },
  expectations: { type: String, maxlength: 2000 },
  partnerPreference: { type: String, maxlength: 2000 },
  photos: { type: [String], default: [] },
  status: { type: String, enum: ['pending', 'approved', 'published', 'rejected', 'hidden'], default: 'pending' },
  operatorNote: { type: String, maxlength: 2000 },
}, { timestamps: true, versionKey: false });
biodataSchema.methods.toTeaser = function () {
  return { id: this._id, profileType: this.profileType, age: this.age, profession: this.profession, district: this.district, education: this.education, status: this.status };
};
export default mongoose.model('Biodata', biodataSchema);
