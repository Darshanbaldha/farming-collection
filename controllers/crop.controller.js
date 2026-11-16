const CropEntry = require("../database/models/CropEntry");

async function createCropEntry(req, res, next) {
  try {
    const crop = String(req.body.crop || "").trim().toLowerCase();
    const quantity = Number(req.body.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000000) {
      return res.status(400).json({ message: "Enter a valid quantity in kg greater than zero." });
    }

    await CropEntry.create({ crop, quantity });
    return res.status(201).json({
      message: `${quantity} kg of ${crop} has been submitted successfully.`,
      crop,
      quantity,
      unit: "kg",
    });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    return next(error);
  }
}

module.exports = { createCropEntry };
