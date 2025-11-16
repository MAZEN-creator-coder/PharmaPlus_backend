const Order = require("../models/order.model");
const Pharmacy = require("../models/pharmacy.model");
const Medicine = require("../models/medicine.model");
const User = require("../models/user.model");
const { getLast7Months } = require("../utilities/date.helper");

exports.calculatePharmacyStats = async (pharmacyId) => {

  const [orders, medicines] = await Promise.all([
    Order.find({ pharmacyId }),
    Medicine.find({ pharmacy: pharmacyId })
  ]);

  // ---------------------------
  // Total Orders
  // ---------------------------
  const totalOrders = orders.length;

  // ---------------------------
  // Total Sales (sum of totals)
  // ---------------------------
  const totalSales = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

  // ---------------------------
  // Products in Stock (sum stock)
  // ---------------------------
  const productsInStock = medicines.reduce((sum, m) => sum + (m.stock || 0), 0);

  // ---------------------------
  // No of Customers (unique users)
  // ---------------------------
  const customerSet = new Set(orders.map(o => String(o.userId)));
  const noOfCustomers = customerSet.size;

  // ---------------------------
  // Last 7 Months Sales
  // ---------------------------
  const months = getLast7Months();
  const last7MonthsSales = months.map(month => {

    const salesOfMonth = orders
      .filter(o => o.createdAt.toISOString().startsWith(month))
      .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

    return { month, sales: salesOfMonth };
  });

  // ---------------------------
  // Update Pharmacy
  // ---------------------------
  await Pharmacy.findByIdAndUpdate(pharmacyId, {
    totalOrders,
    totalSales,
    productsInStock,
    noOfCustomers,
    last7MonthsSales
  });

  return {
    totalOrders,
    totalSales,
    productsInStock,
    noOfCustomers,
    last7MonthsSales
  };
};
