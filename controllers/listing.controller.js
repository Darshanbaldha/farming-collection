const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const Account = require("../database/models/Account");
const Listing = require("../database/models/Listing");

const uploadDirectory = path.join(__dirname, "../public/uploads");
const validAvailability = new Set(["available", "limited", "sold_out"]);
const validCategories = new Set(["vegetables", "fruits", "grains", "other"]);
const FRUITS = new Set(["apple", "apples", "banana", "bananas", "grape", "grapes", "kiwi", "pear", "pears", "dragon fruit", "orange", "mango", "papaya", "pomegranate", "watermelon", "muskmelon", "guava", "pineapple"]);
const VEGETABLES = new Set(["tomato", "tomatoes", "potato", "potatoes", "onion", "onions", "cabbage", "capsicum", "lemon", "limbu", "cauliflower", "carrot", "cucumber", "brinjal", "okra", "spinach", "chilli", "broccoli"]);
const GRAINS = new Set(["rice", "wheat", "wheet", "corn", "maize", "millet", "bajra", "jowar"]);
function inferCategory(name) {
  const value = String(name || "").trim().toLowerCase();
  if (FRUITS.has(value)) return "fruits";
  if (VEGETABLES.has(value)) return "vegetables";
  if (GRAINS.has(value)) return "grains";
  return "other";
}

async function accountFor(req) {
  return Account.findOne({ email: req.session.user.email }).select("_id email");
}

async function createListing(req, res, next) {
  let savedImagePath;
  try {
    const account = await accountFor(req);
    if (!account) return res.status(401).json({ message: "Please log in again." });
    const cropName = String(req.body.cropName || "").trim();
    const description = String(req.body.description || "").trim();
    const pricePerKg = Number(req.body.pricePerKg);
    const quantityKg = Number(req.body.quantityKg);
    const availability = String(req.body.availability || "available");
    const category = String(req.body.category || inferCategory(cropName)).toLowerCase();

    if (!cropName || cropName.length > 80) return res.status(400).json({ message: "Enter a crop name (maximum 80 characters)." });
    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0 || pricePerKg > 1000000) return res.status(400).json({ message: "Enter a valid price per kg." });
    if (!Number.isFinite(quantityKg) || quantityKg < 0.25 || quantityKg > 1000000) return res.status(400).json({ message: "Enter a valid quantity of at least 0.25 kg." });
    if (!validAvailability.has(availability)) return res.status(400).json({ message: "Choose a valid availability status." });
    if (!validCategories.has(category)) return res.status(400).json({ message: "Choose a valid crop category." });
    if (!req.file) return res.status(400).json({ message: "Please upload a crop image." });

    await fs.mkdir(uploadDirectory, { recursive: true });
    const extension = req.file.mimetype === "image/png" ? ".png" : req.file.mimetype === "image/webp" ? ".webp" : ".jpg";
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`;
    savedImagePath = path.join(uploadDirectory, fileName);
    await fs.writeFile(savedImagePath, req.file.buffer);

    const listing = await Listing.create({
      seller: account._id, cropName, description, category, pricePerKg, quantityKg,
      imageUrl: `/uploads/${fileName}`, availability,
    });
    return res.status(201).json({ message: "Your crop listing has been published.", listing });
  } catch (error) {
    if (savedImagePath) await fs.unlink(savedImagePath).catch(() => {});
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    return next(error);
  }
}

async function listListings(req, res, next) {
  try {
    const filter = req.query.mine === "true"
      ? { seller: (await accountFor(req))?._id }
      : { availability: { $ne: "sold_out" } };
    if (req.query.category && validCategories.has(String(req.query.category))) filter.category = String(req.query.category);
    if (!filter.seller && req.query.mine === "true") return res.status(401).json({ message: "Please log in again." });
    const listings = await Listing.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ listings });
  } catch (error) { return next(error); }
}

async function updateListing(req, res, next) {
  try {
    const account = await accountFor(req);
    if (!account) return res.status(401).json({ message: "Please log in again." });
    const listing = await Listing.findOne({ _id: req.params.id, seller: account._id });
    if (!listing) return res.status(404).json({ message: "Your listing was not found." });
    const { cropName, description, category, pricePerKg, quantityKg, availability } = req.body;
    if (cropName !== undefined) listing.cropName = String(cropName).trim();
    if (description !== undefined) listing.description = String(description).trim();
    if (category !== undefined) { if (!validCategories.has(category)) return res.status(400).json({ message: "Choose a valid crop category." }); listing.category = category; }
    if (pricePerKg !== undefined) listing.pricePerKg = Number(pricePerKg);
    if (quantityKg !== undefined) listing.quantityKg = Number(quantityKg);
    if (availability !== undefined) {
      if (!validAvailability.has(availability)) return res.status(400).json({ message: "Choose a valid availability status." });
      listing.availability = availability;
    }
    if (listing.quantityKg === 0) listing.availability = "sold_out";
    await listing.save();
    return res.json({ message: "Listing updated successfully.", listing });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    return next(error);
  }
}

async function deleteListing(req, res, next) {
  try {
    const account = await accountFor(req);
    if (!account) return res.status(401).json({ message: "Please log in again." });
    const listing = await Listing.findOneAndDelete({ _id: req.params.id, seller: account._id });
    if (!listing) return res.status(404).json({ message: "Your listing was not found." });
    // Keep the image file: existing carts and historical orders may still reference it.
    return res.json({ message: "Listing deleted successfully." });
  } catch (error) { return next(error); }
}

module.exports = { createListing, listListings, updateListing, deleteListing };
