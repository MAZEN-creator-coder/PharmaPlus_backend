const mongoose = require("mongoose");

const monthlySalesSchema = new mongoose.Schema({
  month: { type: String, required: true }, // "2024-10"
  sales: { type: Number, default: 0 }
}, { _id: false });

const pharmacySchema = new mongoose.Schema({
  name: { type: String, required: true },
  img: { type: String, default: "uploads/pharmacy-default.png" },

  license: String,
  contact: String,
  email: String,

  address: String,
  position: {
    lat: { type: Number },
    lng: { type: Number }
  },

  status: { 
    type: String, 
    enum: ["active", "inactive"],
    default: "inactive",
    required: true
  },
  rating: { type: Number, default: 0 },
  
  description: String,

  categorys: [String],

  // ربط الصيدلية بـ Admin (المسؤول عنها)
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  totalSales: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  productsInStock: { type: Number, default: 0 },
  noOfCustomers: { type: Number, default: 0 },

  last7MonthsSales: [monthlySalesSchema],

}, { timestamps: true });

module.exports = mongoose.model("Pharmacy", pharmacySchema);
