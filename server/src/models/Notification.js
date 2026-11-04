import mongoose from 'mongoose';
const s = new mongoose.Schema({ user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, title:{type:String,required:true,maxlength:200}, body:{type:String,maxlength:2000}, kind:{type:String,enum:['interest','payment','biodata','support','system'],default:'system'}, read:{type:Boolean,default:false}, link:{type:String,maxlength:200} }, {timestamps:true, versionKey:false});
export default mongoose.model('Notification', s);
