const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", default: null },
  name: { type: String, required: true },
  pricePerKg: { type: Number, required: true },
  quantityKg: { type: Number, required: true },
  imageUrl: { type: String, default: "" },
  lineTotal: { type: Number, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
  items: { type: [orderItemSchema], required: true },
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  deliveryCharge: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, enum: ["placed", "processing", "shipped", "delivered", "cancelled"], default: "placed" },
  paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
