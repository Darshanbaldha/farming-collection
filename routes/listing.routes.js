const router = require("express").Router();
const multer = require("multer");
const { requireAuth } = require("../middleware/auth.middleware");
const { createListing, listListings, updateListing, deleteListing } = require("../controllers/listing.controller");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) return callback(null, true);
    return callback(new Error("Only JPG, PNG and WEBP crop images are allowed."));
  },
});

router.use(requireAuth);
router.get("/", listListings);
router.post("/", upload.single("image"), createListing);
router.patch("/:id", updateListing);
router.delete("/:id", deleteListing);
module.exports = router;
