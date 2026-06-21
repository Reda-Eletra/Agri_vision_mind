const express = require("express");
const router = express.Router();
const authenticate = require("../middlewares/auth");
const { requireAdmin } = require("../controllers/adminController");
const {
  createContactMessage,
  getAdminContactMessages,
  updateAdminContactMessage,
  deleteAdminContactMessage,
} = require("../controllers/contactController");

router.post("/contact-messages", createContactMessage);
router.get("/admin/contact-messages", authenticate, requireAdmin, getAdminContactMessages);
router.patch("/admin/contact-messages/:id", authenticate, requireAdmin, updateAdminContactMessage);
router.delete("/admin/contact-messages/:id", authenticate, requireAdmin, deleteAdminContactMessage);

module.exports = router;
