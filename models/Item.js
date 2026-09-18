const mongoose = require("mongoose");

const salesLogSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  purchaseDate: { type: Date, default: Date.now },
  price: { type: Number, default: 0 },
  type: {
    type: String,
    enum: ["purchase", "adoption"],
    default: "purchase",
  },
});

const itemSchema = new mongoose.Schema(
  {
    artworkId: { type: String, required: true, trim: true, index: true },
    museum: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    audioUrl: { type: String, default: "" },
    tourAuthor: { type: String, required: true },
    floor: {
      type: String,
      default: "0",
      enum: ["-1", "0", "1", "2"],
    },
    mapX: {
      type: Number,
      default: 0,
    },
    mapY: {
      type: Number,
      default: 0,
    },
    style: {
      type: String,
      required: false,
      trim: true,
      default: "Unspecified historical period",
    },
    artist: { type: String, default: "Unknown" },
    period: { type: String },
    url: { type: String, default: null },
    length: {
      type: String,
      enum: ["3s", "15s", "40s", "1m"],
      required: true,
    },
    language: {
      type: String,
      enum: ["child", "medium", "advanced"],
      required: true,
    },
    category: { type: String, default: "other" },
    tags: [String],
    license: {
      type: { type: String, default: "free" },
      notes: String,
    },
    price: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    contentDepth: { type: String, default: "standard" },
    salesLogs: [salesLogSchema],
  },
  { timestamps: true, strict: false },
);

itemSchema.index({ museum: 1, published: 1 });
itemSchema.index({ artworkId: 1, language: 1 });

module.exports = mongoose.model("Item", itemSchema, "items");
