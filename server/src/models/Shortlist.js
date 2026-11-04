import mongoose from 'mongoose';
const s = new mongoose.Schema({ user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, biodata:{type:mongoose.Schema.Types.ObjectId,ref:'Biodata',required:true}, note:{type:String,maxlength:500} }, {timestamps:true, versionKey:false});
s.index({user:1,biodata:1},{unique:true});
export default mongoose.model('Shortlist', s);
