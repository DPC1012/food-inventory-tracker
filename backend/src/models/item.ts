import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["produce", "dairy", "meat", "pantry", "frozen", "other"],
      default: "other",
    },
    quantity: {
      type: Number,
      default: 1,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["fresh", "expiring-soon", "used", "expired", "wasted"],
      default: "fresh",
    },
  },
  {
    timestamps: true,
  },
);

export const Item = mongoose.model("Item", itemSchema);
