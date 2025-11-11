const httpStatus = require('../utilities/httpstatustext');
const Users = require("../models/user.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/* =========================
   🔹 Get All Users (Paginated)
========================= */
const getAllUsers = asyncWrapper(async (req, res) => {
  const query = req.query;
  const limit = parseInt(query.limit) || 10;
  const page = parseInt(query.page) || 1;
  const skip = (page - 1) * limit;

  const users = await Users.find({}, { __v: 0, password: 0 })
    .skip(skip)
    .limit(limit);

  res.json({
    status: httpStatus.success,
    data: { users },
  });
});

/* =========================
   🔹 Register
========================= */
const register = asyncWrapper(async (req, res, next) => {
  const {
    firstname,
    lastname,
    email,
    password,
    role,
    phone,
    dob,
    joined,
  } = req.body;

  const existingUser = await Users.findOne({ email });
  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 400;
    return next(error);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const filename = req.file?.filename || "avatar-default.jpeg";

  const newUser = new Users({
    firstname,
    lastname,
    fullName: `${firstname} ${lastname}`,
    email,
    password: hashedPassword,
    role,
    phone,
    dob,
    joined: joined || new Date().toISOString().split('T')[0],
    avatar: `uploads/${filename}`,
    preferences: {
      newsletter: true,
      smsAlerts: false,
    },
    conversations: [],
    orders: [],
  });

  // Generate JWT token
  const userToken = jwt.sign(
    { id: newUser._id, email: newUser.email, role: newUser.role, image: newUser.avatar },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '1h' }
  );

  newUser.token = userToken;
  await newUser.save();

  res.status(201).json({
    status: httpStatus.success,
    data: { token: userToken, user: newUser },
  });
});

/* =========================
   🔹 Login
========================= */
const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    return next(error);
  }

  const existingUser = await Users.findOne({ email });
  if (!existingUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }

  const isPasswordMatch = await bcrypt.compare(password, existingUser.password);
  if (!isPasswordMatch) {
    const error = new Error("Invalid password");
    error.statusCode = 401;
    return next(error);
  }

  const userToken = jwt.sign(
    { id: existingUser._id, email: existingUser.email, role: existingUser.role, image: existingUser.avatar },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '1h' }
  );

  existingUser.token = userToken;
  await existingUser.save();

  res.json({
    status: httpStatus.success,
    data: { token: userToken, user: existingUser },
  });
});

/* =========================
   🔹 Get User by ID
========================= */
const getUserById = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const user = await Users.findById(id, { __v: 0, password: 0 });
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }
  res.json({ status: httpStatus.success, data: { user } });
});

/* =========================
   🔹 Update User
========================= */
const updateUser = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  if (req.file) {
    updateData.avatar = `uploads/${req.file.filename}`;
  }

  if (updateData.firstname || updateData.lastname) {
    updateData.fullName = `${updateData.firstname || ''} ${updateData.lastname || ''}`.trim();
  }

  const updatedUser = await Users.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  if (!updatedUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }

  res.json({ status: httpStatus.success, data: { user: updatedUser } });
});

/* =========================
   🔹 Add Order
========================= */
const addOrder = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const  order  = req.body;

  const user = await Users.findById(id);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }

  user.orders.push(order);
  await user.save();

  res.json({ status: httpStatus.success, data: { orders: user.orders } });
});

/* =========================
   🔹 Add Conversation
========================= */
const addConversation = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const  conversation  = req.body;

  const user = await Users.findById(id);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }

  user.conversations.push(conversation);
  await user.save();

  res.json({ status: httpStatus.success, data: { conversations: user.conversations } });
});

/* =========================
   🔹 Update Preferences
========================= */
const updatePreferences = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const { preferences } = req.body;

  const user = await Users.findById(id);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }

  user.preferences = { ...user.preferences, ...preferences };
  await user.save();

  res.json({ status: httpStatus.success, data: { preferences: user.preferences } });
});

/* =========================
   🔹 Delete User
========================= */
const deleteUser = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const user = await Users.findByIdAndDelete(id);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }
  res.json({ status: httpStatus.success, message: "User deleted successfully" });
});

module.exports = {
  getAllUsers,
  register,
  login,
  getUserById,
  updateUser,
  deleteUser,
  addOrder,
  addConversation,
  updatePreferences,
};
