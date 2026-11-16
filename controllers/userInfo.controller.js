const UserInfo = require("../database/models/UserInfo");

async function getMyUserInfo(req, res, next) {
  try {
    res.setHeader("Cache-Control", "no-store, private");
    const profile = await UserInfo.findOne({
      $or: [
        { account: req.session.user.accountId },
        { email: req.session.user.email },
      ],
    })
      .select("name email mobileNumber state city address farmAddress pincode createdAt updatedAt")
      .lean();

    if (!profile) {
      return res.status(404).json({ message: "Your profile has not been completed yet." });
    }

    return res.status(200).json({ profile });
  } catch (error) {
    return next(error);
  }
}

async function createUserInfo(req, res, next) {
  try {
    if (!req.session?.user?.email || !req.session.user.accountId) {
      return res.status(401).json({ message: "Please log in to complete your profile." });
    }
    const payload = {
      account: req.session.user.accountId,
      name: String(req.body.name || "").trim(),
      email: req.session.user.email,
      mobileNumber: String(req.body.mobileNumber || "").trim(),
      state: String(req.body.state || "").trim(),
      city: String(req.body.city || "").trim(),
      address: String(req.body.address || "").trim(),
      farmAddress: String(req.body.farmAddress || "").trim(),
      pincode: String(req.body.pincode || "").trim(),
    };
    const saved = await UserInfo.findOneAndUpdate(
      { $or: [{ account: req.session.user.accountId }, { email: req.session.user.email }] },
      { $set: payload },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    req.session.user.profileComplete = true;
    await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
    return res.status(200).json({ message: "Your profile details have been saved successfully.", profile: { name: saved.name, email: saved.email } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Profile details already exist for this account." });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    return next(error);
  }
}
module.exports = { getMyUserInfo, createUserInfo };
