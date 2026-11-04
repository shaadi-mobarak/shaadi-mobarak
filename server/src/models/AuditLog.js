import mongoose from 'mongoose';
const s = new mongoose.Schema({ actor:{type:mongoose.Schema.Types.ObjectId,ref:'User',default:null}, action:{type:String,required:true,maxlength:200}, targetType:{type:String,maxlength:100}, targetId:{type:String,maxlength:100}, detail:{type:String,maxlength:2000} }, {timestamps:true, versionKey:false});
export default mongoose.model('AuditLog', s);
