function requireAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.email) {
    return next();
  }

  const isApiRequest = req.originalUrl.startsWith("/api/") || req.xhr || req.get("accept")?.includes("application/json");
  if (isApiRequest) {
    return res.status(401).json({ message: "Please log in to access this feature." });
  }

  const returnTo = encodeURIComponent(req.originalUrl || "/index.html");
  return res.redirect(`/login.html?next=${returnTo}`);
}

module.exports = { requireAuth };
