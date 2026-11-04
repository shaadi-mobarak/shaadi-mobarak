import mongoose from 'mongoose';
const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  amountBDT: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['bKash', 'Nagad', 'Rocket', 'Card', 'Manual', 'SSLCommerz'], required: true },
  transactionId: { type: String, trim: true, maxlength: 100 },
  receipt: { type: String, maxlength: 500 },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'refunded'], default: 'pending' },
  provider: { type: String, enum: ['bKash','Nagad','Rocket','SSLCommerz','Manual','Card'], default: 'Manual' },
  gatewayRef: { type: String, maxlength: 200 },
  refundNote: { type: String, maxlength: 1000 },
}, { timestamps: true, versionKey: false });
export default mongoose.model('Payment', paymentSchema);
