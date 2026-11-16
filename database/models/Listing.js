const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
  cropName: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  category: { type: String, enum: ["vegetables", "fruits", "grains", "other"], default: "other", index: true },
  pricePerKg: { type: Number, required: true, min: 0.01, max: 1000000 },
  quantityKg: { type: Number, required: true, min: 0, max: 1000000 },
  imageUrl: { type: String, required: true },
  availability: { type: String, enum: ["available", "limited", "sold_out"], default: "available", index: true },
}, { timestamps: true });

listingSchema.index({ availability: 1, category: 1, createdAt: -1 });
module.exports = mongoose.model("Listing", listingSchema);
