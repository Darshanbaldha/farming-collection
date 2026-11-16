const router = require("express").Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { getMyUserInfo, createUserInfo } = require("../controllers/userInfo.controller");

router.get("/me", requireAuth, getMyUserInfo);
router.post("/", requireAuth, createUserInfo);

module.exports = router;
