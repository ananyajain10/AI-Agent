import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const userSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minLength:[6, 'email must be at least 6 characters long'],
        maxLength: [50, 'email must be at most 50 characters long']
    }, 
    password:{
        type: String,
        required: true,
        select: false
        
    }
})

userSchema.statics.hashPassword = async function(password){
    return await bcrypt.hash(password, 10);
}

userSchema.methods.isValidPassword = async function(password){
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateJWT = async function(){
    return jwt.sign({email: this.email}, process.env.JWT_SECRET, {expiresIn: "24h"});
}

const User = mongoose.model("user", userSchema);
export default User;
