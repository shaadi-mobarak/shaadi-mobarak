import mongoose from 'mongoose';
const s = new mongoose.Schema({ type:{type:String,enum:['blog','faq','page','banner'],required:true}, title:{type:String,required:true,trim:true,maxlength:200}, slug:{type:String,trim:true,maxlength:200,unique:true,sparse:true}, body:{type:String,maxlength:20000}, image:{type:String,maxlength:500}, isActive:{type:Boolean,default:true}, sortOrder:{type:Number,default:0} }, {timestamps:true, versionKey:false});
export default mongoose.model('Content', s);
