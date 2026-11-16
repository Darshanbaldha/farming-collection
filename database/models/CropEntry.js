const mongoose = require("mongoose");

const cropEntrySchema = new mongoose.Schema(
  {
    crop: {
      type: String,
      required: true,
      enum: ["apple", "banana", "rice", "wheat", "potato", "tomato", "corn"],
      lowercase: true,
    },
    quantity: { type: Number, required: true, min: 0.25, max: 100000000 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

module.exports = mongoose.model("CropEntry", cropEntrySchema);
