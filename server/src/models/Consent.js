import mongoose from 'mongoose';
// Recorded consent before any full biodata/photo/contact is shared with a family.
const s = new mongoose.Schema({ biodata:{type:mongoose.Schema.Types.ObjectId,ref:'Biodata',required:true}, sharedWithUser:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, grantedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, scope:{type:String,enum:['biodata','photos','contact','all'],default:'biodata'}, status:{type:String,enum:['granted','revoked'],default:'granted'}, note:{type:String,maxlength:1000} }, {timestamps:true, versionKey:false});
export default mongoose.model('Consent', s);
