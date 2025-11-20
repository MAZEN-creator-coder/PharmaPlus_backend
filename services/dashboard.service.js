const User = require("../models/user.model");
const Pharmacy = require("../models/pharmacy.model");
const Order = require("../models/order.model");
const Medicine = require("../models/medicine.model");

async function getDashboardData() {
  // Platform Summary
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

  // User Growth (last 12 months)
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
  // Revenue Distribution (using pharmacy.categorys)
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

  // Convert to percentages (optional)
  const totalCategoryCount = revenueDistribution.reduce((a,b) => a + b.value, 0);

  const revenueDistributionPercent = revenueDistribution.map(r => ({
    name: r.name,
    value: totalCategoryCount 
      ? ((r.value / totalCategoryCount) * 100).toFixed(2)
      : 0
  }));

  // -----------------------------------------
  // Top Pharmacies
  // -----------------------------------------
  const topPharmaciesAgg = await Pharmacy.find()
    .sort({ totalSales: -1 })
    .limit(5)
    .select("name totalSales");

  const topPharmacies = topPharmaciesAgg.map(p => ({
    name: p.name,
    sales: p.totalSales
  }));

  // -----------------------------------------
  // Pharmacy Status Summary
  // -----------------------------------------
  const statuses = ["active", "inactive"];
  const pharmacyStatusSummary = {};

  for (let s of statuses) {
    pharmacyStatusSummary[s] = await Pharmacy.countDocuments({ status: s });
  }

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
      avgOrderValue
    },
    userGrowth,
    revenueDistribution: revenueDistributionPercent,
    topPharmacies,
    pharmacyStatusSummary
  };
}

module.exports = {
  getDashboardData
};
