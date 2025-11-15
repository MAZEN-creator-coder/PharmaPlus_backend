const Order = require("../models/order.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const httpStatus = require("../utilities/httpstatustext");


const createOrder = asyncWrapper(async (req, res) => {
  const orderData = req.body;

  const newOrder = await Order.create(orderData);

  res.status(201).json({
    status: httpStatus.success,
    data: { order: newOrder },
  });
});

const getOrders = asyncWrapper(async (req, res) => {
  const orders = await Order.find()
    .populate("pharmacyId", "name position"); 

  res.json({
    status: httpStatus.success,
    data: { orders },
  });
});


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


const getOrdersByUser = asyncWrapper(async (req, res) => {
  const { userId } = req.params;

  const orders = await Order.find({ userId })
    .populate("pharmacyId", "name position");

  res.json({ status: httpStatus.success, data: { orders } });
});


const getOrdersByPharmacy = asyncWrapper(async (req, res) => {
  const { pharmacyId } = req.params;

  const orders = await Order.find({ pharmacyId });

  res.json({ status: httpStatus.success, data: { orders } });
});


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
