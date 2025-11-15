const Order = require("../models/order.model");
const User = require("../models/user.model");
const Pharmacy = require("../models/pharmacy.model");
const Medicine = require("../models/medicine.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const httpStatus = require("../utilities/httpstatustext");


const createOrder = asyncWrapper(async (req, res) => {
  const { userId, pharmacyId, items, address, paymentMethod, total } = req.body;

  if (!userId) {
    const error = new Error("userId is required");
    error.statusCode = 400;
    throw error;
  }

  if (!pharmacyId) {
    const error = new Error("pharmacyId is required");
    error.statusCode = 400;
    throw error;
  }

  if (!items || items.length === 0) {
    const error = new Error("items array is required and cannot be empty");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) {
    const error = new Error("Pharmacy not found");
    error.statusCode = 404;
    throw error;
  }

  for (let item of items) {
    if (!item.medicine) {
      const error = new Error("medicine id is required for all items");
      error.statusCode = 400;
      throw error;
    }

    if (!item.quantity || item.quantity <= 0) {
      const error = new Error("quantity must be greater than 0 for all items");
      error.statusCode = 400;
      throw error;
    }

    const medicine = await Medicine.findById(item.medicine);
    if (!medicine) {
      const error = new Error(`Medicine with id ${item.medicine} not found`);
      error.statusCode = 404;
      throw error;
    }

    if (medicine.pharmacy.toString() !== pharmacyId) {
      const error = new Error(`Medicine ${medicine.name} does not belong to this pharmacy`);
      error.statusCode = 400;
      throw error;
    }

    if (medicine.stock < item.quantity) {
      const error = new Error(`Not enough stock for medicine ${medicine.name}. Available: ${medicine.stock}, Requested: ${item.quantity}`);
      error.statusCode = 400;
      throw error;
    }
  }

  const orderData = {
    userId,
    pharmacyId,
    items,
    address,
    paymentMethod,
    total,
    date: new Date().toISOString().split('T')[0],
    status: "Pending"
  };

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
