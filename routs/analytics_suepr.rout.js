// routes/dashboard.routes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifytoken");
const { getDashboardController } = require("../controllers/dashboard.controller");

// GET /api/dashboard
router.get("/", verifyToken, getDashboardController);

module.exports = router;
