const mongoose = require("mongoose");

const userInfoSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", unique: true, sparse: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    mobileNumber: { type: String, required: true, trim: true, match: /^[0-9+()\-\s]{10,15}$/ },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    address: { type: String, required: true, trim: true, maxlength: 250 },
    farmAddress: { type: String, trim: true, maxlength: 250, default: "" },
    city: { type: String, trim: true, maxlength: 80, default: "" },
    pincode: { type: String, required: true, match: /^[0-9]{6}$/ },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

module.exports = mongoose.model("UserInfo", userInfoSchema);
