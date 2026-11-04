import mongoose from 'mongoose';
const s = new mongoose.Schema({ user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, package:{type:mongoose.Schema.Types.ObjectId,ref:'Package',required:true}, payment:{type:mongoose.Schema.Types.ObjectId,ref:'Payment',default:null}, startsAt:{type:Date,required:true}, endsAt:{type:Date,required:true}, proposalsUsed:{type:Number,default:0}, meetingsUsed:{type:Number,default:0}, status:{type:String,enum:['active','expired','cancelled'],default:'active'} }, {timestamps:true, versionKey:false});
export default mongoose.model('Membership', s);
