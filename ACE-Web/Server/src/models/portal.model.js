import mongoose from "mongoose";

export const portalSchema = new mongoose.Schema({
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    UID: { type: String, required: true},
    dateCreated: { type: Date, required: true },
    portals: [
        {
            querySubject: {
                type: String,
            },
            querierId: {
                type: String,
            },
            dateInitialized: {
                type: Date,
            },
            dateQueryClosed: {
                type: Date,
            },
            messages: [
                {
                    type: String
                }
            ]
        }

    ],
  
});

export const Portal = mongoose.model("Portal", portalSchema);