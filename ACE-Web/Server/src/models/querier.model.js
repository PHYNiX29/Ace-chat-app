import mongoose from "mongoose";


export const querierSchema = new mongoose.Schema({
    UID: { type: String, required: true }, // user UID enter karega
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // querierId: { type: String, required: true, unique: true }
});

export const Querier = mongoose.model("Querier", querierSchema);