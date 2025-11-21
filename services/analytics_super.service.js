const User = require("../models/user.model");
const Pharmacy = require("../models/pharmacy.model");
const Order = require("../models/order.model");
const Medicine = require("../models/medicine.model");

async function getDashboardData() {
  // ---------------------------
  // Platform Summary
  // ---------------------------
  const totalUsers = await User.countDocuments({
    role: { $ne: "superadmin" }
  });

  const totalRevenueAgg = await Order.aggregate([
    { $match: { status: "Delivered" } },
    { $group: { _id: null, total: { $sum: { $toDouble: "$total" } } } }
  ]);
  const totalRevenue = totalRevenueAgg[0]?.total || 0;

  const activePharmacies = await Pharmacy.countDocuments({ status: "active" });
  const totalOrders = await Order.countDocuments({ status: "Delivered" });

  const totalServedAgg = await Order.aggregate([
    { $match: { status: "Delivered" } },
    { $group: { _id: null, served: { $sum: 1 } } }
  ]);
  const totalServed = totalServedAgg[0]?.served || 0;

  const avgOrderValue = totalRevenue / (totalOrders || 1);

  // ---------------------------
  // User Growth (last 12 months)
  // ---------------------------
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const userGrowth = [];
  const currentYear = new Date().getFullYear();

  for (let m = 0; m < 12; m++) {
    const start = new Date(currentYear, m, 1);
    const end = new Date(currentYear, m + 1, 1);

    const count = await User.countDocuments({
      createdAt: { $gte: start, $lt: end },
      role: { $ne: "superadmin" }
    });

    userGrowth.push({ month: months[m], users: count });
  }

  // -----------------------------------------
  // Revenue Distribution (أحسبها من categorys الموجودة في الصيدليات)
  // -----------------------------------------
  const pharmacies = await Pharmacy.find({}, "categorys");

  const allCategories = pharmacies.flatMap(p => p.categorys || []);

  const categoryCount = {};
  allCategories.forEach(cat => {
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  const revenueDistribution = Object.keys(categoryCount).map(key => ({
    name: key,
    value: categoryCount[key]
  }));

  const totalCategoryCount = revenueDistribution.reduce((a,b) => a + b.value, 0);

  const revenueDistributionPercent = revenueDistribution.map(r => ({
    name: r.name,
    value: totalCategoryCount 
      ? ((r.value / totalCategoryCount) * 100).toFixed(2)
      : 0
  }));

  // -----------------------------------------
  // 1) Stock Value For Active Pharmacies
  // -----------------------------------------
  const stockValueAgg = await Medicine.aggregate([
    {
      $lookup: {
        from: "pharmacies",
        localField: "pharmacy",
        foreignField: "_id",
        as: "pharmacy"
      }
    },
    { $unwind: "$pharmacy" },
    { $match: { "pharmacy.status": "active" } },
    {
      $group: {
        _id: null,
        total: { $sum: { $multiply: ["$stock", "$price"] } }
      }
    }
  ]);
  const activeStockValue = stockValueAgg[0]?.total || 0;

  // -----------------------------------------
  // 2) Active Orders (not Cancelled)
  // -----------------------------------------
  const activeOrders = await Order.countDocuments({
    status: { $ne: "Cancelled" }
  });

  // -----------------------------------------
  // 3) Stock Movement (عدد الأدوية في كل category)
  // -----------------------------------------
  const stockMovement = await Medicine.aggregate([
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 }
      }
    },
    {
      $project: { _id: 0, category: "$_id", count: 1 }
    }
  ]);

  // -----------------------------------------
  // 4) Order Status Distribution
  // -----------------------------------------
  const orderStatusAgg = await Order.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  const totalOrdersAll = orderStatusAgg.reduce((a, b) => a + b.count, 0);

  const orderStatus = orderStatusAgg.map(s => ({
    status: s._id,
    percent: ((s.count / (totalOrdersAll || 1)) * 100).toFixed(2)
  }));

  // -----------------------------------------
  // 5) Top Pharmacies (with stockValue + totalOrders)
  // -----------------------------------------
  const topPharmaciesAgg = await Pharmacy.find()
    .sort({ totalSales: -1 })
    .limit(5);
const topPharmacies = await Promise.all(
  topPharmaciesAgg.map(async p => {
    const stockAgg = await Medicine.aggregate([
      { $match: { pharmacy: p._id } },
      {
        $group: {
          _id: null,
          stockValue: { $sum: { $multiply: ["$stock", "$price"] } }
        }
      }
    ]);

    const totalPharmacyOrders = await Order.countDocuments({
      pharmacyId: p._id
    });

    // عدد الطلبات اللي اتخدمت (Delivered)
    const servedOrders = await Order.countDocuments({
      pharmacyId: p._id,
      status: "Delivered"
    });

    return {
      id: p._id,                     
      name: p.name,
      location: p.address,            // ← جديد
      status: p.status,               // ← جديد
      served: servedOrders,           // ← جديد
      sales: p.totalSales,
      stockValue: stockAgg[0]?.stockValue || 0,
      totalOrders: totalPharmacyOrders
    };
  })
);

  // -----------------------------------------
// 6) Daily Sales For Current Month
// -----------------------------------------
const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
const startOfMonth = new Date(year, month, 1);
const endOfMonth = new Date(year, month + 1, 1);

const dailySalesAgg = await Order.aggregate([
  {
    $match: {
      status: "Delivered",
      createdAt: { $gte: startOfMonth, $lt: endOfMonth }
    }
  },
  {
    $group: {
      _id: { $dayOfMonth: "$createdAt" },
      totalSales: { $sum: { $toDouble: "$total" } }
    }
  },
  { $sort: { "_id": 1 } }
]);

const daysInMonth = new Date(year, month + 1, 0).getDate();
const dailySalesThisMonth = Array.from({ length: daysInMonth }, (_, i) => {
  const dayAgg = dailySalesAgg.find(d => d._id === i + 1);
  return {
    day: i + 1,
    totalSales: dayAgg ? dayAgg.totalSales : 0
  };
});


  // ---------------------------
  // Final return object
  // ---------------------------
  return {
    meta: {
      generatedAt: new Date(),
      reportTitle: "Global Analytics Overview"
    },
    platformSummary: {
      totalUsers,
      totalRevenue,
      activePharmacies,
      totalOrders,
      totalServed,
      avgOrderValue,
      activeStockValue,
      activeOrders
    },
    userGrowth,
    revenueDistribution: revenueDistributionPercent,
    stockMovement,
    orderStatus,
    topPharmacies,
     dailySalesThisMonth, 
    pharmacyStatusSummary: {
      active: activePharmacies,
      inactive: await Pharmacy.countDocuments({ status: "inactive" })
    }
  };
}

module.exports = {
  getDashboardData
};
