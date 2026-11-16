require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const connectDatabase = require("./database/connection");
const authRoutes = require("./routes/auth.routes");
const userInfoRoutes = require("./routes/userInfo.routes");
const contactRoutes = require("./routes/contact.routes");
const cropRoutes = require("./routes/crop.routes");
const cartRoutes = require("./routes/cart.routes");
const listingRoutes = require("./routes/listing.routes");
const { notFound, errorHandler } = require("./middleware/error.middleware");
const { requireAuth } = require("./middleware/auth.middleware");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const publicPath = path.join(__dirname, "public");

app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(express.json({ limit: "20kb" }));

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing. Add it to your .env file.");
}

app.use(
  session({
    name: "fc.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      dbName: "farming_collection_text",
      collectionName: "sessions",
      ttl: 60 * 60 * 8,
    }),

    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

// Protect member-only pages before Express serves static HTML files.
const memberPages = new Set(["/buy.html", "/sell.html", "/cart.html", "/profile-setup.html", "/account.html"]);
app.use((req, res, next) => {
  if (req.path === "/info.html") return res.redirect(302, "/profile-setup.html");
  if (!memberPages.has(req.path)) return next();
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  return requireAuth(req, res, next);
});

// Serve the original HTML pages and their CSS, JS and image assets.
app.use("/uploads", express.static(path.join(publicPath, "uploads"), { maxAge: "7d", immutable: true }));

app.use(express.static(publicPath, {
  etag: true,
  maxAge: "1h",
  setHeaders(res, filePath) {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase();
    if (["buy.html", "sell.html", "cart.html", "profile-setup.html", "account.html"].includes(fileName)) {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.setHeader("Pragma", "no-cache");
      return;
    }
    if ([".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico"].includes(extension)) {
      res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    }
  },
}));

app.use("/api", authRoutes);
app.use("/api/user-info", userInfoRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/crops", cropRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/listings", listingRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", app: "Farming Collection" });
});

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`Farming Collection running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

start();
