const express = require("express");
const router = express.Router();
const controller = require("../controllers/pharmacy.controller");
const verifyToken = require("../middleware/verifytoken");

const multer = require("multer");

// ------- Upload Config -------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `pharmacy-${Date.now()}.${ext}`);
  }
});
const upload = multer({ storage });

// ------- Routes -------
router.post("/", verifyToken, upload.single("img"), controller.addPharmacy);
router.get("/", verifyToken, controller.getAllPharmacies);
router.get("/:id", verifyToken, controller.getPharmacyById);
router.put("/:id", verifyToken, upload.single("img"), controller.updatePharmacy);
router.delete("/:id", verifyToken, controller.deletePharmacy);

router.get("/:id/medicines", verifyToken, controller.getMedicinesByPharmacyId);
router.get("/:id/dashboard", verifyToken, controller.getPharmacyDashboard);


router.get("/:id/top-medicines", verifyToken, controller.getTopMedicines);
router.get("/:id/sales-by-category", verifyToken, controller.getSalesByCategory);
router.get("/:id/low-stock-alerts", verifyToken, controller.getLowStockAlerts);
router.get("/:id/customer-analytics", verifyToken, controller.getCustomerAnalytics);

module.exports = router;
