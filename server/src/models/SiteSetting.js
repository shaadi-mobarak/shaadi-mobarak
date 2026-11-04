import mongoose from 'mongoose';
const s = new mongoose.Schema({ key:{type:String,required:true,unique:true,trim:true}, value:{type:String,default:''} }, {timestamps:true, versionKey:false});
export default mongoose.model('SiteSetting', s);
