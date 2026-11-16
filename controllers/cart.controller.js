const crypto = require("crypto");
const Account = require("../database/models/Account");
const Cart = require("../database/models/Cart");
const Listing = require("../database/models/Listing");
const Order = require("../database/models/Order");

const TAX_RATE = 0.05;
const DELIVERY_CHARGE = 15;
const CATALOG = {
  potato: { name: "Potato", pricePerKg: 30 }, tomato: { name: "Tomato", pricePerKg: 40 },
  onion: { name: "Onion", pricePerKg: 35 }, cabbage: { name: "Cabbage", pricePerKg: 28 },
  capsicum: { name: "Capsicum", pricePerKg: 60 }, lemon: { name: "Lemon", pricePerKg: 55 },
  apple: { name: "Apple", pricePerKg: 180 }, banana: { name: "Banana", pricePerKg: 60 },
  grapes: { name: "Grapes", pricePerKg: 120 }, kiwi: { name: "Kiwi", pricePerKg: 250 },
  pear: { name: "Pear", pricePerKg: 140 }, "dragon-fruit": { name: "Dragon Fruit", pricePerKg: 160 },
  rice: { name: "Rice", pricePerKg: 70 }, wheat: { name: "Wheat", pricePerKg: 35 }, corn: { name: "Corn", pricePerKg: 32 },
};

async function getAccount(req) {
  return Account.findOne({ email: req.session.user.email }).select("_id email");
}

async function getOrCreateCart(accountId) {
  return Cart.findOneAndUpdate(
    { account: accountId },
    { $setOnInsert: { account: accountId, items: [] } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function getCart(req, res, next) {
  try {
    const account = await getAccount(req);
    if (!account) return res.status(401).json({ message: "Please log in again." });
    const cart = await getOrCreateCart(account._id);
    return res.json({ items: cart.items, count: cart.items.length });
  } catch (error) { return next(error); }
}

async function addCartItem(req, res, next) {
  try {
    const account = await getAccount(req);
    if (!account) return res.status(401).json({ message: "Please log in again." });
    const { listingId } = req.body;
    let item;
    let availableQuantity = null;

    if (listingId) {
      const listing = await Listing.findOne({ _id: listingId, availability: { $ne: "sold_out" } });
      if (!listing) return res.status(404).json({ message: "This farm listing is no longer available." });
      availableQuantity = listing.quantityKg;
      item = {
        productKey: `listing:${listing._id}`,
        listingId: listing._id,
        name: listing.cropName,
        pricePerKg: listing.pricePerKg,
        imageUrl: listing.imageUrl,
        quantityKg: Math.min(1, listing.quantityKg),
      };
    } else {
      const submittedName = String(req.body.name || "").trim();
      const key = String(req.body.productKey || submittedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")).toLowerCase();
      const product = CATALOG[key];
      if (!product) return res.status(400).json({ message: "This catalogue product is not available." });
      const submittedImage = String(req.body.imageUrl || "");
      const imageUrl = submittedImage.startsWith("/img/") && !submittedImage.includes("..") ? submittedImage : "/img/product-1.png";
      item = { productKey: `catalog:${key}`, name: product.name, pricePerKg: product.pricePerKg, imageUrl, quantityKg: 1 };
    }

    const cart = await getOrCreateCart(account._id);
    const existing = cart.items.find((entry) => entry.productKey === item.productKey);
    const nextQuantity = existing ? Math.round((existing.quantityKg + 1) * 100) / 100 : item.quantityKg;
    if (availableQuantity !== null && nextQuantity > availableQuantity) {
      return res.status(400).json({ message: `Only ${availableQuantity} kg is currently available for ${item.name}.` });
    }
    if (existing) existing.quantityKg = nextQuantity;
    else cart.items.push(item);
    await cart.save();
    return res.status(200).json({ message: `${item.name} added to your cart.`, items: cart.items, count: cart.items.length });
  } catch (error) { return next(error); }
}

async function updateCartItem(req, res, next) {
  try {
    const quantityKg = Number(req.body.quantityKg);
    if (!Number.isFinite(quantityKg) || quantityKg < 0.25 || quantityKg > 100000) {
      return res.status(400).json({ message: "Quantity must be at least 0.25 kg." });
    }
    const account = await getAccount(req);
    if (!account) return res.status(401).json({ message: "Please log in again." });
    const cart = await Cart.findOne({ account: account._id });
    const item = cart?.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Cart item not found." });
    if (item.listingId) {
      const listing = await Listing.findById(item.listingId);
      if (!listing || listing.availability === "sold_out" || quantityKg > listing.quantityKg) {
        return res.status(400).json({ message: `Only ${listing?.quantityKg || 0} kg is currently available.` });
      }
    }
    item.quantityKg = quantityKg;
    await cart.save();
    return res.json({ message: "Cart quantity updated.", items: cart.items });
  } catch (error) { return next(error); }
}

async function removeCartItem(req, res, next) {
  try {
    const account = await getAccount(req);
    if (!account) return res.status(401).json({ message: "Please log in again." });
    const cart = await Cart.findOne({ account: account._id });
    if (!cart?.items.id(req.params.itemId)) return res.status(404).json({ message: "Cart item not found." });
    cart.items.pull({ _id: req.params.itemId });
    await cart.save();
    return res.json({ message: "Item removed from cart.", items: cart.items });
  } catch (error) { return next(error); }
}

async function checkout(req, res, next) {
  let claimedCart = null;
  const stockChanges = [];
  let createdOrder = null;
  try {
    const account = await getAccount(req);
    if (!account) return res.status(401).json({ message: "Please log in again." });
    const currentCart = await Cart.findOne({ account: account._id });
    if (!currentCart || currentCart.items.length === 0) return res.status(400).json({ message: "Your cart is empty." });

    const items = currentCart.items.map((item) => ({
      listingId: item.listingId || null,
      name: item.name,
      pricePerKg: item.pricePerKg,
      quantityKg: item.quantityKg,
      imageUrl: item.imageUrl,
      lineTotal: Number((item.pricePerKg * item.quantityKg).toFixed(2)),
    }));

    // Validate current farmer stock before claiming this cart for checkout.
    for (const item of items) {
      if (!item.listingId) continue;
      const listing = await Listing.findById(item.listingId).select("quantityKg availability cropName");
      if (!listing || listing.availability === "sold_out" || item.quantityKg > listing.quantityKg) {
        return res.status(409).json({ message: `${item.name} is no longer available in the requested quantity.` });
      }
    }

    // Atomically empty only the exact cart version we inspected. This prevents duplicate orders
    // if a customer double-clicks Checkout or sends two checkout requests at once.
    claimedCart = await Cart.findOneAndUpdate(
      { _id: currentCart._id, updatedAt: currentCart.updatedAt, "items.0": { $exists: true } },
      { $set: { items: [] } },
      { new: false }
    );
    if (!claimedCart) return res.status(409).json({ message: "Your cart changed while checking out. Please review it and try again." });

    // Reserve stock atomically so two customers cannot buy more than the farmer has listed.
    for (const item of items) {
      if (!item.listingId) continue;
      const listing = await Listing.findOneAndUpdate(
        { _id: item.listingId, availability: { $ne: "sold_out" }, quantityKg: { $gte: item.quantityKg } },
        { $inc: { quantityKg: -item.quantityKg } },
        { new: true }
      );
      if (!listing) throw new Error(`${item.name} stock changed. Please review your cart and try again.`);
      stockChanges.push({ id: listing._id, quantityKg: item.quantityKg, previousAvailability: listing.availability });
      if (listing.quantityKg <= 0) {
        await Listing.updateOne({ _id: listing._id }, { $set: { availability: "sold_out" } });
      } else if (listing.quantityKg <= 5) {
        await Listing.updateOne({ _id: listing._id }, { $set: { availability: "limited" } });
      }
    }

    const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
    const tax = Number((subtotal * TAX_RATE).toFixed(2));
    const deliveryCharge = DELIVERY_CHARGE;
    const total = Number((subtotal + tax + deliveryCharge).toFixed(2));
    const orderNumber = `FC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    createdOrder = await Order.create({
      orderNumber, account: account._id, items, subtotal, tax, deliveryCharge, total,
    });

    return res.status(201).json({
      message: "Your order has been placed successfully. Online payment is not enabled in this demo.",
      order: { orderNumber: createdOrder.orderNumber, total: createdOrder.total, status: createdOrder.status },
      items: [],
    });
  } catch (error) {
    // Roll back reserved stock and restore the cart if the order could not be saved.
    if (createdOrder) await Order.deleteOne({ _id: createdOrder._id }).catch(() => {});
    for (const change of stockChanges.reverse()) {
      await Listing.updateOne(
        { _id: change.id },
        { $inc: { quantityKg: change.quantityKg }, $set: { availability: change.previousAvailability === "sold_out" ? "available" : change.previousAvailability } }
      ).catch(() => {});
    }
    if (claimedCart) {
      await Cart.updateOne(
        { _id: claimedCart._id, "items.0": { $exists: false } },
        { $set: { items: claimedCart.items } }
      ).catch(() => {});
    }
    if (error.message?.includes("stock changed")) return res.status(409).json({ message: error.message });
    return next(error);
  }
}

module.exports = { getCart, addCartItem, updateCartItem, removeCartItem, checkout };
