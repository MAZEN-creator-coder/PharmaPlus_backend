const Medicine = require("../models/medicine.model");
const Pharmacy = require("../models/pharmacy.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const httpStatus = require("../utilities/httpstatustext");

const calculateMedicineStatus = (stock, threshold) => {
  if (stock === 0) {
    return "outOfStock";
  }
  
  if (stock <= threshold) {
    return "lowStock";
  }
  
  return "Available";
};

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

  if (medicineData.stock !== undefined && medicineData.threshold !== undefined) {
    medicineData.status = calculateMedicineStatus(medicineData.stock, medicineData.threshold);
    console.log(`✅ تم حساب الحالة: stock=${medicineData.stock}, threshold=${medicineData.threshold}, status=${medicineData.status}`);
  }

  const newMedicine = await Medicine.create(medicineData);

  if (medicineData.category && medicineData.pharmacy) {
    const pharmacy = await Pharmacy.findById(medicineData.pharmacy);
    
    if (pharmacy) {
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

  if (updateData.stock !== undefined || updateData.threshold !== undefined) {
    const stock = updateData.stock !== undefined ? updateData.stock : oldMedicine.stock;
    const threshold = updateData.threshold !== undefined ? updateData.threshold : oldMedicine.threshold;
    
    updateData.status = calculateMedicineStatus(stock, threshold);
    console.log(`✅ تم إعادة حساب الحالة: stock=${stock}, threshold=${threshold}, status=${updateData.status}`);
  }

  const updatedMedicine = await Medicine.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

  if (updateData.category && updateData.category !== oldMedicine.category) {
    const pharmacy = await Pharmacy.findById(updatedMedicine.pharmacy);
    
    if (pharmacy) {
      if (!pharmacy.categorys.includes(updateData.category)) {
        pharmacy.categorys.push(updateData.category);
        await pharmacy.save();
        console.log(`✅ تم إضافة فئة جديدة: ${updateData.category}`);
      }
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
  res.json({ status: httpStatus.success, data: { medicines } });
});

const getMedicinesByName = asyncWrapper(async (req, res) => {
  const { name } = req.query;
  const { lat, lng } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!name) {
    const error = new Error("Medicine name is required");
    error.statusCode = 400;
    throw error;
  }

  const regex = new RegExp(name, "i");
  const medicines = await Medicine.find({ name: regex }).populate("pharmacy");

  // Filter medicines - only from active pharmacies
  const activeMedicines = medicines.filter(med => {
    return med.pharmacy && med.pharmacy.status === "active";
  });

  // If location data provided, calculate distance
  let filteredMedicines = activeMedicines;
  if (lat && lng) {
    const maxDistanceKm = 100000;
    filteredMedicines = activeMedicines
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
      filteredMedicines.sort((a, b) => a.distance - b.distance);
  } else {
    filteredMedicines = activeMedicines.map(med => med.toObject());
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
  getLowStockMedicinesByPharmacy,
  getMedicinesByPharmacy,
  getMedicinesByName,
};
