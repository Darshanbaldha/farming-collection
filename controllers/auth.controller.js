const bcrypt = require("bcryptjs");
const Account = require("../database/models/Account");
const UserInfo = require("../database/models/UserInfo");

function startUserSession(req, email, accountId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.user = { email, accountId: String(accountId) };
      req.session.save((saveError) => saveError ? reject(saveError) : resolve());
    });
  });
}

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validPassword = (password) => password.length >= 8 && password.length <= 128;

async function registerAccount(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    if (!validEmail(email)) return res.status(400).json({ message: "Please enter a valid email address." });
    if (!validPassword(password)) return res.status(400).json({ message: "Password must be between 8 and 128 characters." });
    if (password !== String(req.body.confirmPassword || "")) return res.status(400).json({ message: "Password and confirmation do not match." });
    const existing = await Account.findOne({ email }).lean();
    if (existing) return res.status(409).json({ message: "An account with this email already exists. Please log in." });
    const passwordHash = await bcrypt.hash(password, 12);
    const account = await Account.create({ email, passwordHash });
    await startUserSession(req, email, account._id);
    return res.status(201).json({
      message: "Your Farming Collection account has been created successfully.",
      email, profileComplete: false,
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "An account with this email already exists. Please log in." });
    return next(error);
  }
}

async function loginAccount(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    if (!validEmail(email) || !validPassword(password)) {
      return res.status(400).json({ message: "Enter a valid email address and password (at least 8 characters)." });
    }
    const account = await Account.findOne({ email }).select("+passwordHash");
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) {
      return res.status(401).json({ message: "Incorrect email or password. Please try again." });
    }
    await startUserSession(req, email, account._id);
    const profileComplete = Boolean(await UserInfo.exists({ account: account._id }));
    return res.status(200).json({
      message: "You are now logged in to Farming Collection.",
      email, profileComplete,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { registerAccount, loginAccount };
