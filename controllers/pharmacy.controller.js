const Pharmacy = require("../models/pharmacy.model");
const Medicine = require("../models/medicine.model");
const Order = require("../models/order.model");
const httpStatus = require("../utilities/httpstatustext");
const asyncWrapper = require("../middleware/asyncwrapper");
const analytics = require("../services/pharmacyAnalytics.service");
const locationService = require("../services/location.service");

const addPharmacy = asyncWrapper(async (req, res) => {
  const img = req.file ? `uploads/${req.file.filename}` : undefined;
  
  let pharmacyData = {
    ...req.body,
    img
  };

  if (pharmacyData.address && (!pharmacyData.position || !pharmacyData.position.lat)) {
    console.log(`📍 جاري حساب موقع الصيدلية من العنوان: ${pharmacyData.address}`);
    
    const position = await locationService.getPositionForAddress(pharmacyData.address);
    
    if (position) {
      pharmacyData.position = position;
      console.log(`✅ تم إضافة الموقع تلقائياً: lat=${position.lat}, lng=${position.lng}`);
    } else {
      console.log(`⚠️ لم يتم حساب الموقع، يمكنك إضافته يدوياً لاحقاً`);
    }
  }

  if (!pharmacyData.status) {
    pharmacyData.status = "inactive";
  }

  const pharmacy = await Pharmacy.create(pharmacyData);

  res.status(201).json({
    status: httpStatus.success,
    data: { pharmacy }
  });
});

const getAllPharmacies = asyncWrapper(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const pharmacies = await Pharmacy.find()
    .skip(skip)
    .limit(limit);

  res.json({
    status: httpStatus.success,
    data: { pharmacies }
  });
});

const getPharmacyById = asyncWrapper(async (req, res) => {
  const pharmacy = await Pharmacy.findById(req.params.id);

  if (!pharmacy) {
    return res.status(404).json({
      status: httpStatus.error,
      message: "Pharmacy not found"
    });
  }

  res.json({
    status: httpStatus.success,
    data: { pharmacy }
  });
});

const updatePharmacy = asyncWrapper(async (req, res) => {
  const update = { ...req.body };

  if (req.file) {
    update.img = `uploads/${req.file.filename}`;
  }

  if (update.address && (!update.position || !update.position.lat)) {
    console.log(`📍 جاري حساب موقع جديد من العنوان المحدث: ${update.address}`);
    
    const position = await locationService.getPositionForAddress(update.address);
    
    if (position) {
      update.position = position;
      console.log(`✅ تم تحديث الموقع: lat=${position.lat}, lng=${position.lng}`);
    } else {
      console.log(`⚠️ لم يتم حساب الموقع الجديد`);
    }
  }

  const pharmacy = await Pharmacy.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true
  });

  if (!pharmacy) {
    return res.status(404).json({
      status: httpStatus.error,
      message: "Pharmacy not found"
    });
  }

  res.json({
    status: httpStatus.success,
    data: { pharmacy }
  });
});

const deletePharmacy = asyncWrapper(async (req, res) => {
  const pharmacy = await Pharmacy.findByIdAndDelete(req.params.id);

  if (!pharmacy) {
    return res.status(404).json({
      status: httpStatus.error,
      message: "Pharmacy not found"
    });
  }

  res.json({
    status: httpStatus.success,
    message: "Pharmacy deleted successfully"
  });
});

const getMedicinesByPharmacyId = asyncWrapper(async (req, res) => {
  const medicines = await Medicine.find({ pharmacy: req.params.id });

  res.json({
    status: httpStatus.success,
    data: { medicines }
  });
});

const getPharmacyDashboard = asyncWrapper(async (req, res) => {
  const pharmacyId = req.params.id;

  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy)
    return res.status(404).json({ status: "error", message: "Pharmacy not found" });

  const stats = await analytics.calculatePharmacyStats(pharmacyId);

  res.json({
    status: "success",
    data: {
      pharmacy,
      analytics: stats
    }
  });
});

const getTopMedicines = asyncWrapper(async (req, res) => {
  const pharmacyId = req.params.id;

  const orders = await Order.find({ pharmacyId });

  const medicineMap = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      if (!medicineMap[item.medicine]) medicineMap[item.medicine] = 0;
      medicineMap[item.medicine] += item.quantity;
    });
  });

  const topMedicines = Object.entries(medicineMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([medicineId, quantity]) => ({ medicineId, quantity }));

  res.json({ status: httpStatus.success, pharmacyId, topMedicines });
});

const getSalesByCategory = asyncWrapper(async (req, res) => {
  const pharmacyId = req.params.id;

  const orders = await Order.find({ pharmacyId }).populate('items.medicine');

  const categoryMap = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      if (item.medicine) {
        const category = item.medicine.category || 'Uncategorized';
        const price = item.medicine.price || 0;
        
        if (!categoryMap[category]) categoryMap[category] = 0;
        categoryMap[category] += price * item.quantity;
      }
    });
  });

  res.json({ status: httpStatus.success, pharmacyId, salesByCategory: categoryMap });
});

const getLowStockAlerts = asyncWrapper(async (req, res) => {
  const pharmacyId = req.params.id;

  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) {
    return res.status(404).json({
      status: httpStatus.error,
      message: "Pharmacy not found"
    });
  }

  const medicines = await Medicine.find({ pharmacy: pharmacyId });
  
  const allMedicinesCount = await Medicine.countDocuments({});
  const medicinesWithValidPharmacy = await Medicine.countDocuments({ 
    pharmacy: { $exists: true, $ne: null } 
  });

  const lowStockMedicines = medicines.filter(medicine => 
    medicine.stock <= medicine.threshold
  ).map(medicine => ({
    medicineId: medicine._id,
    name: medicine.name,
    category: medicine.category,
    currentStock: medicine.stock,
    threshold: medicine.threshold,
    status: medicine.status,
    unitsBelow: medicine.threshold - medicine.stock
  }));

  res.json({ 
    status: httpStatus.success, 
    pharmacyId,
    pharmacyName: pharmacy.name,
    totalMedicinesInPharmacy: medicines.length,
    totalLowStockMedicines: lowStockMedicines.length,
    lowStockMedicines
  });
});

const getCustomerAnalytics = asyncWrapper(async (req, res) => {
  const pharmacyId = req.params.id;

  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) {
    const error = new Error("Pharmacy not found");
    error.statusCode = 404;
    throw error;
  }

  const stats = await analytics.calculatePharmacyStats(pharmacyId);

  const orders = await Order.find({ pharmacyId });

  const customerMap = {};
  orders.forEach(order => {
    const userId = order.userId.toString();
    if (!customerMap[userId]) customerMap[userId] = 0;
    customerMap[userId] += parseFloat(order.total) || 0;
  });

  const topCustomers = Object.entries(customerMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, totalSpent]) => ({ userId, totalSpent }));

  res.json({ 
    status: httpStatus.success, 
    data: {
      pharmacyId,
      pharmacy: pharmacy.name,
      totalOrders: stats.totalOrders,
      totalSales: stats.totalSales,
      noOfCustomers: stats.noOfCustomers,
      productsInStock: stats.productsInStock,
      last7MonthsSales: stats.last7MonthsSales,
      topCustomers
    }
  });
});

module.exports = {
  addPharmacy,
  getAllPharmacies,
  getPharmacyById,
  updatePharmacy,
  deletePharmacy,
  getMedicinesByPharmacyId,
  getPharmacyDashboard,
  getTopMedicines,
  getSalesByCategory,
  getLowStockAlerts,
  getCustomerAnalytics
};