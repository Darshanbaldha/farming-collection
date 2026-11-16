function notFound(req, res) {
  res.status(404).send("The requested page or endpoint was not found.");
}

function errorHandler(error, req, res, next) {
  console.error(error);
  if (res.headersSent) return next(error);
  const status = error.statusCode || (error.name === "MulterError" ? 400 : (error.message && error.message.includes("Only JPG") ? 400 : 500));
  const message = process.env.NODE_ENV === "production"
    ? "An unexpected error occurred. Please try again later."
    : error.message;
  res.status(status).send(message);
}

module.exports = { notFound, errorHandler };
