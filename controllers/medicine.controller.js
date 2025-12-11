const Medicine = require("../models/medicine.model");
const Pharmacy = require("../models/pharmacy.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const httpStatus = require("../utilities/httpstatustext");

const calculateMedicineStatus = (stock, threshold) => {
  if (stock === 0) return "outOfStock";
  if (stock <= threshold) return "lowStock";
  return "Available";
};

const getAllMedicines = asyncWrapper(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const medicines = await Medicine.find().skip(skip).limit(limit).populate("pharmacy", "_id");
  const total = await Medicine.countDocuments();
  
  // Ensure pharmacyId is explicitly set for each medicine
  const medicinesWithPharmacyId = medicines.map(med => {
    const obj = med.toObject();
    if (med.pharmacy && med.pharmacy._id) {
      obj.pharmacyId = med.pharmacy._id;
    }
    return obj;
  });

  res.json({
    status: httpStatus.success,
    data: {
      medicines: medicinesWithPharmacyId,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    },
  });
});

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

const createMedicine = asyncWrapper(async (req, res) => {
  const medicineData = req.body;

  if (req.file) {
    medicineData.medicineImage = `uploads/${req.file.filename}`;
  }

  // تحويل القيم إلى أرقام قبل الحساب
  if (medicineData.stock !== undefined) medicineData.stock = Number(medicineData.stock);
  if (medicineData.threshold !== undefined) medicineData.threshold = Number(medicineData.threshold);

  if (medicineData.stock !== undefined && medicineData.threshold !== undefined) {
    medicineData.status = calculateMedicineStatus(medicineData.stock, medicineData.threshold);
    console.log(`✅ تم حساب الحالة: stock=${medicineData.stock}, threshold=${medicineData.threshold}, status=${medicineData.status}`);
  }

  const newMedicine = await Medicine.create(medicineData);

  if (medicineData.category && medicineData.pharmacy) {
    const pharmacy = await Pharmacy.findById(medicineData.pharmacy);
    
    if (pharmacy && !pharmacy.categorys.includes(medicineData.category)) {
      pharmacy.categorys.push(medicineData.category);
      await pharmacy.save();
      console.log(`✅ تم إضافة فئة جديدة للصيدلية: ${medicineData.category}`);
    }
  }

  res.status(201).json({ status: httpStatus.success, data: { medicine: newMedicine } });
});

const updateMedicine = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  if (req.file) {
    updateData.medicineImage = `uploads/${req.file.filename}`;
  }

  const oldMedicine = await Medicine.findById(id);
  if (!oldMedicine) {
    const error = new Error("Medicine not found");
    error.statusCode = 404;
    throw error;
  }

  // تحويل القيم إلى أرقام قبل الحساب
  if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock);
  if (updateData.threshold !== undefined) updateData.threshold = Number(updateData.threshold);

  if (updateData.stock !== undefined || updateData.threshold !== undefined) {
    const stock = updateData.stock !== undefined ? updateData.stock : oldMedicine.stock;
    const threshold = updateData.threshold !== undefined ? updateData.threshold : oldMedicine.threshold;
    updateData.status = calculateMedicineStatus(stock, threshold);
    console.log(`✅ تم إعادة حساب الحالة: stock=${stock}, threshold=${threshold}, status=${updateData.status}`);
  }

  const updatedMedicine = await Medicine.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

  if (updateData.category && updateData.category !== oldMedicine.category) {
    const pharmacy = await Pharmacy.findById(updatedMedicine.pharmacy);
    if (pharmacy && !pharmacy.categorys.includes(updateData.category)) {
      pharmacy.categorys.push(updateData.category);
      await pharmacy.save();
      console.log(`✅ تم إضافة فئة جديدة: ${updateData.category}`);
    }
  }

  res.json({ status: httpStatus.success, data: { medicine: updatedMedicine } });
});

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

const getLowStockMedicines = asyncWrapper(async (req, res) => {
  const lowStockMedicines = await Medicine.find({ $expr: { $lte: ["$stock", "$threshold"] } });
  res.json({ status: httpStatus.success, data: { medicines: lowStockMedicines } });
});

const getLowStockMedicinesByPharmacy = asyncWrapper(async (req, res) => {
  const { pharmacyId } = req.params;
  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) {
    const error = new Error("Pharmacy not found");
    error.statusCode = 404;
    throw error;
  }
  const lowStockMedicines = await Medicine.find({
    pharmacy: pharmacyId,
    $expr: { $lte: ["$stock", "$threshold"] }
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

const getMedicinesByPharmacy = asyncWrapper(async (req, res) => {
  const { pharmacyId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const medicines = await Medicine.find({ pharmacy: pharmacyId }).skip(skip).limit(limit);
  const total = await Medicine.countDocuments({ pharmacy: pharmacyId });
  
  // Add pharmacyId to each medicine for frontend clarity
  const medicinesWithPharmacyId = medicines.map(med => {
    const obj = med.toObject();
    obj.pharmacyId = pharmacyId;
    return obj;
  });
  
  res.json({ 
    status: httpStatus.success, 
    data: { 
      medicines: medicinesWithPharmacyId, 
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } 
    } 
  });
});

const getMedicinesByName = asyncWrapper(async (req, res) => {
  const { name, lat, lng } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!name) {
    const error = new Error("Medicine name is required");
    error.statusCode = 400;
    throw error;
  }

  const regex = new RegExp(name, "i");
  const medicines = await Medicine.find({ name: regex }).populate("pharmacy", "name position status");

  const activeMedicines = medicines.filter(med => med.pharmacy && med.pharmacy.status === "active");

  let filteredMedicines = activeMedicines;
  if (lat && lng) {
    filteredMedicines = activeMedicines
      .map(med => {
        if (!med.pharmacy?.position) return null;
        const distance = getDistanceFromLatLonInKm(
          parseFloat(lat),
          parseFloat(lng),
          med.pharmacy.position.lat,
          med.pharmacy.position.lng
        );
        const medicineObj = med.toObject();
        return { 
          ...medicineObj, 
          distance: parseFloat(distance.toFixed(2)),
          pharmacyId: med.pharmacy._id, // Explicitly include pharmacyId for frontend
          pharmacyName: med.pharmacy.name // Include pharmacy name for frontend display
        };
      })
      .filter(med => med && med.distance <= 100000)
      .sort((a, b) => a.distance - b.distance);
  } else {
    filteredMedicines = activeMedicines.map(med => {
      const medicineObj = med.toObject();
      return {
        ...medicineObj,
        pharmacyId: med.pharmacy._id, // Explicitly include pharmacyId for frontend
        pharmacyName: med.pharmacy.name // Include pharmacy name for frontend display
      };
    });
  }

  const total = filteredMedicines.length;
  const paginatedMedicines = filteredMedicines.slice(skip, skip + limit);

  res.json({
    status: httpStatus.success,
    data: { 
      medicines: paginatedMedicines,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    },
  });
});

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

module.exports = {
  getAllMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getLowStockMedicines,
  getLowStockMedicinesByPharmacy,
  getMedicinesByPharmacy,
  getMedicinesByName,
};
