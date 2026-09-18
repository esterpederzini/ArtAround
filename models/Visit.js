const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema(
  {
    order: Number,
    logistics: String,
    defaultItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    },
    artworkId: { type: String, default: "" },
    difficultyVariants: {
      child: String,
      medium: String,
      advanced: String,
    },
  },
  { _id: false },
);

const visitSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    museum: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    type: { type: String, default: "standard" },
    duration: { type: String, default: "" },
    stopsCount: { type: Number, default: 0 },
    baseLevel: {
      type: String,
      enum: ["child", "medium", "advanced"],
      default: "medium",
    },
    generalInfo: { type: String, default: "" },
    description: { type: String, default: "" },
    stops: [stopSchema],
    price: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: false },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    license: {
      type: { type: String, default: "free" },
      notes: { type: String, default: "" },
    },
    adoptionLogs: [
      {
        adopterId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        adoptionDate: { type: Date, default: Date.now },
        price: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true, strict: false, strictPopulate: false },
);

module.exports = mongoose.model("Visit", visitSchema, "visits");
