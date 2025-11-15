const express = require("express");
const controller = require("../controllers/medicine.controller");
const verifyToken = require("../middleware/verifytoken");
const multer = require("multer");

// إعداد التخزين للصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `medicine-${Date.now()}.${ext}`);
  },
});

// فلترة الملفات
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed!"), false);
};

const upload = multer({ storage, fileFilter });

const router = express.Router();

/* =========================
        Routes
========================= */
// ⚠️ الـ specific routes يجب أن تكون قبل /:id
router.get("/", verifyToken, controller.getAllMedicines);
router.get("/low-stock", verifyToken, controller.getLowStockMedicines);        // ✅ قبل /:id
router.get("/pharmacy/:pharmacyId/low-stock", verifyToken, controller.getLowStockMedicinesByPharmacy);  // ✨ جديد!
router.get("/pharmacy/:pharmacyId", verifyToken, controller.getMedicinesByPharmacy);  // ✅ قبل /:id
router.get("/search", verifyToken, controller.getMedicinesByName);              // ✅ قبل /:id
router.get("/:id", verifyToken, controller.getMedicineById);                   // ✅ في الآخر

// رفع صورة عند الإنشاء
router.post("/", verifyToken, upload.single("medicineImage"), controller.createMedicine);

// رفع صورة عند التحديث
router.put("/:id", verifyToken, upload.single("medicineImage"), controller.updateMedicine);

router.delete("/:id", verifyToken, controller.deleteMedicine);

module.exports = router;
