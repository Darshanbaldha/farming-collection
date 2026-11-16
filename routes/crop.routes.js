const router = require("express").Router();
const { createCropEntry } = require("../controllers/crop.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.post("/", requireAuth, createCropEntry);
module.exports = router;
