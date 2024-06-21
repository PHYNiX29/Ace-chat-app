import mongoose from "mongoose";

export const authoritySchema = new mongoose.Schema({
    authorityName: { type: String, required: true,unique:true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    UID: { type: String }, // generated when verified === true
    password: { type: String, required: true },
    // verificationFiles: [
    //     {
    //         filename: String,
    //         contentType: String,
    //         data: Buffer,
    //     },
    // ],
    verified: {
        type: Boolean,
        required: true,
        default: true
    },
});

export const Authority = mongoose.model("Authority", authoritySchema);