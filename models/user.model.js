const mongoose = require('mongoose');
const validator = require('validator');
const userRoles = require('../utilities/userRoles');

const conversationSchema = new mongoose.Schema({
  name: String,
  avatar: String,
  lastMessage: String,
  time: String,
});

const itemSchema = new mongoose.Schema({
  name: String,
  medicineImage: String,
  price: Number,
  status: String,
  distance: String,
  category: String,
  pharmacy: String,
  description: String,
  quantity: Number,
});

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  additionalDirections: String,
  postalCode: String,
  phone: String,
});

const orderSchema = new mongoose.Schema({
  name: String,
  email: String,
  date: String,
  status: String,
  total: String,
  paymentMethod: String,
  addresses: addressSchema,
  items: [itemSchema],
});

const preferencesSchema = new mongoose.Schema({
  newsletter: { type: Boolean, default: true },
  smsAlerts: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
    minlength: 1,
  },
  lastname: {
    type: String,
    required: true,
    minlength: 1,
  },
  fullName: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: [validator.isEmail, 'Invalid Email'],
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  token: {
    type: String,
  },
  role: {
    type: String,
    enum: [userRoles.ADMIN, userRoles.USER, userRoles.MANAGER],
    default: userRoles.USER,
  },
  avatar: {
    type: String,
    default: 'uploads/avatar.webp',
  },
  phone: {
    type: String,
  },
  dob: {
    type: String,
  },
  joined: {
    type: String,
  },
  conversations: [conversationSchema],
  preferences: preferencesSchema,
  orders: [orderSchema],
});

// ✅ Hide password field from JSON responses
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
