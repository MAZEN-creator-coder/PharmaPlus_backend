const express = require("express");
const controller = require("../controllers/medicine.controller");
const verifyToken = require("../middleware/verifytoken");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `medicine-${Date.now()}.${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed!"), false);
};

const upload = multer({ storage, fileFilter });

const router = express.Router();

router.get("/", verifyToken, controller.getAllMedicines);
router.get("/low-stock", verifyToken, controller.getLowStockMedicines);
router.get("/pharmacy/:pharmacyId/low-stock", verifyToken, controller.getLowStockMedicinesByPharmacy);
router.get("/pharmacy/:pharmacyId", verifyToken, controller.getMedicinesByPharmacy);
router.get("/search", verifyToken, controller.getMedicinesByName);
router.get("/:id", verifyToken, controller.getMedicineById);

router.post("/", verifyToken, upload.single("medicineImage"), controller.createMedicine);

router.put("/:id", verifyToken, upload.single("medicineImage"), controller.updateMedicine);

router.delete("/:id", verifyToken, controller.deleteMedicine);

module.exports = router;
