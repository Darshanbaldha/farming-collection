const router = require("express").Router();
const { registerAccount, loginAccount } = require("../controllers/auth.controller");
const UserInfo = require("../database/models/UserInfo");

router.post("/signup", registerAccount);
router.post("/login", loginAccount);

router.get("/session", async (req, res, next) => {
  try {
  res.setHeader("Cache-Control", "no-store, private");
  if (!req.session?.user?.email) {
    return res.status(200).json({ authenticated: false, user: null });
  }
  const profileComplete = Boolean(await UserInfo.exists({ account: req.session.user.accountId }));
  return res.status(200).json({ authenticated: true, profileComplete, user: { email: req.session.user.email } });
  } catch (error) { return next(error); }
});

router.post("/logout", (req, res, next) => {
  if (!req.session) return res.status(200).json({ message: "You have been logged out." });
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("fc.sid", { path: "/", sameSite: "lax" });
    return res.status(200).json({ message: "You have been logged out successfully." });
  });
});

module.exports = router;
