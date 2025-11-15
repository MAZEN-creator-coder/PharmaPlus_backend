const Medicine = require("../models/medicine.model");
const Pharmacy = require("../models/pharmacy.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const httpStatus = require("../utilities/httpstatustext");

/* =========================
   🔹 Helper Function: Calculate Medicine Status
========================= */
const calculateMedicineStatus = (stock, threshold) => {
  // إذا المخزون = 0 → منقضي
  if (stock === 0) {
    return "outOfStock";
  }
  
  // إذا المخزون <= الحد الأدنى → مخزون منخفض
  if (stock <= threshold) {
    return "lowStock";
  }
  
  // إذا المخزون > الحد الأدنى → متاح
  return "Available";
};

/* =========================
   🔹 Get All Medicines
========================= */
const getAllMedicines = asyncWrapper(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const medicines = await Medicine.find().skip(skip).limit(limit);
  const total = await Medicine.countDocuments();

  res.json({
    status: httpStatus.success,
    data: {
      medicines,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    },
  });
});


/* =========================
   🔹 Get Medicine by ID
========================= */
const getMedicineById = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const medicine = await Medicine.findById(id).populate("pharmacy", "name position");
  if (!medicine) {
    const error = new Error("Medicine not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ status: httpStatus.success, data: { medicine } });
});

/* =========================
   🔹 Create Medicine
========================= */
const createMedicine = asyncWrapper(async (req, res) => {
  const medicineData = req.body;

  if (req.file) {
    medicineData.medicineImage = `uploads/${req.file.filename}`;
  }

  // 📊 حساب الـ status تلقائياً بناءً على stock و threshold
  if (medicineData.stock !== undefined && medicineData.threshold !== undefined) {
    medicineData.status = calculateMedicineStatus(medicineData.stock, medicineData.threshold);
    console.log(`✅ تم حساب الحالة: stock=${medicineData.stock}, threshold=${medicineData.threshold}, status=${medicineData.status}`);
  }

  const newMedicine = await Medicine.create(medicineData);

  // 🏥 إضافة الفئة إلى قائمة فئات الصيدلية تلقائياً
  if (medicineData.category && medicineData.pharmacy) {
    const pharmacy = await Pharmacy.findById(medicineData.pharmacy);
    
    if (pharmacy) {
      // تحقق إذا كانت الفئة موجودة بالفعل
      if (!pharmacy.categorys.includes(medicineData.category)) {
        pharmacy.categorys.push(medicineData.category);
        await pharmacy.save();
        console.log(`✅ تم إضافة فئة جديدة للصيدلية: ${medicineData.category}`);
      } else {
        console.log(`ℹ️ الفئة موجودة بالفعل: ${medicineData.category}`);
      }
    }
  }

  res.status(201).json({ status: httpStatus.success, data: { medicine: newMedicine } });
});

/* =========================
   🔹 Update Medicine
========================= */
const updateMedicine = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  if (req.file) {
    updateData.medicineImage = `uploads/${req.file.filename}`;
  }

  // احصل على الدواء القديم أولاً
  const oldMedicine = await Medicine.findById(id);
  if (!oldMedicine) {
    const error = new Error("Medicine not found");
    error.statusCode = 404;
    throw error;
  }

  // 📊 إعادة حساب الـ status إذا تم تعديل stock أو threshold
  if (updateData.stock !== undefined || updateData.threshold !== undefined) {
    const stock = updateData.stock !== undefined ? updateData.stock : oldMedicine.stock;
    const threshold = updateData.threshold !== undefined ? updateData.threshold : oldMedicine.threshold;
    
    updateData.status = calculateMedicineStatus(stock, threshold);
    console.log(`✅ تم إعادة حساب الحالة: stock=${stock}, threshold=${threshold}, status=${updateData.status}`);
  }

  const updatedMedicine = await Medicine.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

  // 🏥 إذا تم تغيير الفئة، أضفها للصيدلية
  if (updateData.category && updateData.category !== oldMedicine.category) {
    const pharmacy = await Pharmacy.findById(updatedMedicine.pharmacy);
    
    if (pharmacy) {
      // أضف الفئة الجديدة إذا لم تكن موجودة
      if (!pharmacy.categorys.includes(updateData.category)) {
        pharmacy.categorys.push(updateData.category);
        await pharmacy.save();
        console.log(`✅ تم إضافة فئة جديدة: ${updateData.category}`);
      }
    }
  }

  res.json({ status: httpStatus.success, data: { medicine: updatedMedicine } });
});

/* =========================
   🔹 Delete Medicine
========================= */
const deleteMedicine = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const medicine = await Medicine.findByIdAndDelete(id);
  if (!medicine) {
    const error = new Error("Medicine not found");
    error.statusCode = 404;
    throw error;
  }
  res.json({ status: httpStatus.success, message: "Medicine deleted successfully" });
});

/* =========================
   🔹 Get Low Stock Medicines
========================= */
const getLowStockMedicines = asyncWrapper(async (req, res) => {
  const lowStockMedicines = await Medicine.find({ $expr: { $lte: ["$stock", "$threshold"] } });
  res.json({ status: httpStatus.success, data: { medicines: lowStockMedicines } });
});

/* =========================
   🔹 Get Low Stock Medicines for Specific Pharmacy
========================= */
const getLowStockMedicinesByPharmacy = asyncWrapper(async (req, res) => {
  const { pharmacyId } = req.params;
  
  // تحقق من وجود الصيدلية
  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) {
    const error = new Error("Pharmacy not found");
    error.statusCode = 404;
    throw error;
  }

  // احصل على الأدوية منخفضة المخزون للصيدلية المعينة
  const lowStockMedicines = await Medicine.find({
    pharmacy: pharmacyId,
    $expr: { $lte: ["$stock", "$threshold"] }  // stock <= threshold
  });

  res.json({ 
    status: httpStatus.success, 
    data: { 
      pharmacy: pharmacy.name,
      lowStockCount: lowStockMedicines.length,
      medicines: lowStockMedicines 
    } 
  });
});

/* =========================
   🔹 Get Medicines by Pharmacy ID
========================= */
const getMedicinesByPharmacy = asyncWrapper(async (req, res) => {
  const { pharmacyId } = req.params;
  const medicines = await Medicine.find({ pharmacyId });
  res.json({ status: httpStatus.success, data: { medicines } });
});

/* =========================
   🔹 Get Medicines by Name + Nearby
========================= */
const getMedicinesByName = asyncWrapper(async (req, res) => {
  const { name } = req.query;
  const { lat, lng } = req.query; // موقع المستخدم

  if (!lat || !lng) {
    const error = new Error("User location (lat, lng) is required");
    error.statusCode = 400;
    throw error;
  }

  const regex = new RegExp(name, "i");
  const medicines = await Medicine.find({ name: regex }).populate("pharmacy", "name position");

  const maxDistanceKm = 100000; // أقصى مسافة
  const medicinesNearby = medicines
    .map((med) => {
      if (!med.pharmacy?.position) return null;

      const distance = getDistanceFromLatLonInKm(
        parseFloat(lat),
        parseFloat(lng),
        med.pharmacy.position.lat,
        med.pharmacy.position.lng
      );

      return {
        ...med.toObject(),
        distance: parseFloat(distance.toFixed(2)),
      };
    })
    .filter((med) => med && med.distance <= maxDistanceKm);

  res.json({
    status: "success",
    data: { medicines: medicinesNearby },
  });
});

/* =========================
   🔹 حساب المسافة بين نقطتين بالـ KM
========================= */
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
function deg2rad(deg) {
  return deg * (Math.PI/180);
}

module.exports = {
  getAllMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getLowStockMedicines,
  getLowStockMedicinesByPharmacy,  // ✨ جديد!
  getMedicinesByPharmacy,
  getMedicinesByName,
};
