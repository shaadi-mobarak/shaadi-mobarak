import mongoose from 'mongoose';
// Interest goes to the OPERATOR inbox only. No direct chat, call or contact reveal.
// Operator forwards it, records the response and arranges any meeting.
const interestSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetBiodata: { type: mongoose.Schema.Types.ObjectId, ref: 'Biodata', required: true },
  message: { type: String, maxlength: 1000 },
  status: { type: String, enum: ['pending', 'forwarded', 'approved', 'rejected', 'meeting_scheduled'], default: 'pending' },
  operatorNote: { type: String, maxlength: 2000 },
  meetingDate: { type: Date, default: null },
}, { timestamps: true, versionKey: false });
export default mongoose.model('InterestRequest', interestSchema);
