const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  additionalDirections: String,
  postalCode: String,
  phone: String,
});

const orderItemSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Medicine",
    required: true
  },
  quantity: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  // روابط رئيسية
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pharmacy",
    required: true
  },

  // بيانات الطلب
  date: { type: String },
  status: {
    type: String,
    enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
    default: "Pending"
  },

  total: String,
  paymentMethod: String,

  address: addressSchema,
  items: [orderItemSchema],

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
