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

  if (pharmacy.status !== "active") {
    const error = new Error("Pharmacy is not active. Cannot place order");
    error.statusCode = 400;
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

  for (let item of items) {
    await Medicine.findByIdAndUpdate(
      item.medicine,
      { $inc: { stock: -item.quantity } },
      { new: true }
    );
  }

  res.status(201).json({
    status: httpStatus.success,
    data: { order: newOrder },
  });
});

const getOrders = asyncWrapper(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const total = await Order.countDocuments();
  const orders = await Order.find()
    .populate("pharmacyId", "name position")
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.json({
    status: httpStatus.success,
    data: { 
      orders
    }
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
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const total = await Order.countDocuments({ userId });
  const orders = await Order.find({ userId })
    .populate("pharmacyId", "name position")
    .populate({ path: 'items.medicine', select: 'name' })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.json({ 
    status: httpStatus.success, 
    data: { orders }
  });
});


const getOrdersByPharmacy = asyncWrapper(async (req, res) => {
  const { pharmacyId } = req.params;
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;

  const total = await Order.countDocuments({ pharmacyId });
  const orders = await Order.find({ pharmacyId })
    .skip(skip)
    .limit(limit)
    .sort({ updatedAt: -1 });

  res.json({ 
    status: httpStatus.success, 
    data: { orders },
   
  });
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
