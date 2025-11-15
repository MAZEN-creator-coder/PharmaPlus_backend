const Order = require("../models/order.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const httpStatus = require("../utilities/httpstatustext");

/* =========================
   🔹 Create Order
========================= */
const createOrder = asyncWrapper(async (req, res) => {
  const orderData = req.body;

  const newOrder = await Order.create(orderData);

  res.status(201).json({
    status: httpStatus.success,
    data: { order: newOrder },
  });
});

/* =========================
   🔹 Get All Orders (Admin)
   ترجع كل بيانات الـ Order + اسم وposition للصيدلية
========================= */
const getOrders = asyncWrapper(async (req, res) => {
  const orders = await Order.find()
    .populate("pharmacyId", "name position"); // فقط الاسم والموقع للصيدلية

  res.json({
    status: httpStatus.success,
    data: { orders },
  });
});

/* =========================
   🔹 Get Order by ID
========================= */
const getOrderById = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id)
    .populate("pharmacyId", "name position");

  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  res.json({ status: httpStatus.success, data: { order } });
});

/* =========================
   🔹 Get Orders by User
========================= */
const getOrdersByUser = asyncWrapper(async (req, res) => {
  const { userId } = req.params;

  const orders = await Order.find({ userId })
    .populate("pharmacyId", "name position");

  res.json({ status: httpStatus.success, data: { orders } });
});

/* =========================
   🔹 Get Orders by Pharmacy
========================= */
const getOrdersByPharmacy = asyncWrapper(async (req, res) => {
  const { pharmacyId } = req.params;

  const orders = await Order.find({ pharmacyId });

  res.json({ status: httpStatus.success, data: { orders } });
});

/* =========================
   🔹 Update Order Status
========================= */
const updateOrderStatus = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = await Order.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  res.json({ status: httpStatus.success, data: { order } });
});

/* =========================
   🔹 Delete Order
========================= */
const deleteOrder = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findByIdAndDelete(id);

  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  res.json({ status: httpStatus.success, message: "Order deleted successfully" });
});

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  getOrdersByUser,
  getOrdersByPharmacy,
  updateOrderStatus,
  deleteOrder,
};
