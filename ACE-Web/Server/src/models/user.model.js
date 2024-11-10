import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },  
    password: { type: String, required: true },
    // email: { type: String, required: true, unique: true },  //bcrypted      
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // chats:[{type:String}]
});

export const User = mongoose.model("User", userSchema);