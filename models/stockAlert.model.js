const mongoose = require("mongoose");

const stockAlertSchema = new mongoose.Schema({

  pharmacy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pharmacy",
    required: true
  },

  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Medicine",
    required: true
  },

  name: String,
  stock: Number,
  threshold: Number,

  alertCode: {
    type: String,
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("StockAlert", stockAlertSchema);
