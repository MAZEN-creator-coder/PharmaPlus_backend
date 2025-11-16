const mongoose = require('mongoose');
const validator = require('validator');
const userRoles = require('../utilities/userRoles');

const conversationSchema = new mongoose.Schema({
  name: String,
  avatar: String,
  lastMessage: String,
  time: String,
});

const preferencesSchema = new mongoose.Schema({
  newsletter: { type: Boolean, default: true },
  smsAlerts: { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  firstname: { type: String, required: true },
  lastname: { type: String },
  fullName: String,

  email: {
    type: String,
    required: true,
    unique: true,
    validate: [validator.isEmail, 'Invalid Email'],
  },

  password: { type: String, required: true },
  token: String,

  role: {
    type: String,
    enum: [userRoles.ADMIN, userRoles.USER, userRoles.MANAGER],
    default: userRoles.USER,
  },

  avatar: { type: String, default: 'uploads/avatar.webp' },

  phone: String,
  dob: String,
  joined: String,
  
  license: {
    type: String,
    default: null
  },
  
  address: {
    type: String,
  },

  position: {
    lat: { type: Number },
    lng: { type: Number }
  },

  pharmacyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pharmacy',
    default: null
  },

  conversations: [conversationSchema],
  preferences: preferencesSchema,

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
