const Contact = require("../database/models/Contact");

async function createContact(req, res, next) {
  try {
    const contact = await Contact.create({
      name: String(req.body.name || "").trim(),
      email: String(req.body.email || "").trim().toLowerCase(),
      message: String(req.body.message || req.body.suggest || "").trim(),
    });
    return res.status(201).send("Thank you. Your message has been submitted.");
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).send(error.message);
    return next(error);
  }
}

module.exports = { createContact };
