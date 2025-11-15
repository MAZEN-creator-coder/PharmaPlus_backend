const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  medicineImage: { 
    type: String, 
    default: "uploads/medicine-default.jpg"  // 📷 صورة افتراضية
  },
  category: String,

  price: Number,
  stock: Number,
  threshold: Number,

  status: {
    type: String,
    enum: ["Available", "lowStock", "outOfStock"],
    default: "Available"
  },

  description: String,

  pharmacy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pharmacy",
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Medicine", medicineSchema);
