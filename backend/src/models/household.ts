import mongoose from "mongoose";


const housholdSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    inviteCode: {
        type: String,
        required: true,
        unique: true
    },
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },  
    ],
    wasteScore: {
        type: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

export const Household = mongoose.model("Household", housholdSchema);