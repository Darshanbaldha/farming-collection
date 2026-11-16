const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  productKey: { type: String, required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", default: null },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  pricePerKg: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, default: "/img/product-1.png" },
  quantityKg: { type: Number, required: true, min: 0.25, max: 100000 },
}, { _id: true });

const cartSchema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, unique: true, index: true },
  items: { type: [cartItemSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model("Cart", cartSchema);
