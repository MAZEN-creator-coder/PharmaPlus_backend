const httpStatus = require('../utilities/httpstatustext');
const Users = require("../models/user.model");
const Pharmacy = require("../models/pharmacy.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRoles = require('../utilities/userRoles');
const locationService = require('../services/location.service');

/* =========================
   🔹 Helper Function: Create Pharmacy for Admin
========================= */
const createPharmacyForAdmin = async (user) => {
  try {
    let pharmacyData = {
      name: `${user.fullName}'s Pharmacy`,
      contact: user.phone || '',
      email: user.email,
      status: 'inactive',
      managerId: user._id,
    };

    if (user.address) {
      pharmacyData.address = user.address;
    }

    // 🌍 الأولوية: استخدام Geolocation من User إن توفرت
    if (user.position && user.position.lat && user.position.lng) {
      pharmacyData.position = user.position;
      console.log(`✅ تم استخدام Geolocation من User: lat=${user.position.lat}, lng=${user.position.lng}`);
    } 
    // إذا لم يكن هناك Geolocation، حاول حساب الموقع من العنوان
    else if (user.address) {
      console.log(`📍 جاري حساب موقع الصيدلية من عنوان المستخدم: ${user.address}`);
      
      const position = await locationService.getPositionForAddress(user.address);
      
      if (position) {
        pharmacyData.position = position;
        console.log(`✅ تم حساب الموقع من العنوان: lat=${position.lat}, lng=${position.lng}`);
      } else {
        console.log(`⚠️ لم يتم حساب الموقع من العنوان`);
      }
    } else {
      console.log(`⚠️ لا توجد بيانات موقع (بدون Geolocation وبدون عنوان)`);
    }

    const pharmacy = await Pharmacy.create(pharmacyData);
    
    // ربط المستخدم بالصيدلية
    user.pharmacyId = pharmacy._id;
    await user.save();
    
    console.log(`✅ تم إنشاء صيدلية للـ Admin: ${user.email}`);
    return pharmacy;
  } catch (error) {
    console.error('Error creating pharmacy for admin:', error);
    throw error;
  }
};

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
    address,      // ✅ العنوان
    latitude,     // ✅ Geolocation من Frontend
    longitude,    // ✅ Geolocation من Frontend
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

  const filename = req.file?.filename || "avatar.webp";

  const newUser = new Users({
    firstname,
    lastname,
    fullName: `${firstname} ${lastname}`,
    email,
    password: hashedPassword,
    role: role || userRoles.USER,
    phone,
    dob,
    joined: joined || new Date().toISOString().split('T')[0],
    avatar: `uploads/${filename}`,
    address: address || null,
    preferences: {
      newsletter: true,
      smsAlerts: false,
    },
    conversations: [],
  });

  // 🌍 إذا Frontend مرجع latitude و longitude → حطها في position
  if (latitude && longitude) {
    newUser.position = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude)
    };
    console.log(`✅ تم حفظ Geolocation: lat=${latitude}, lng=${longitude}`);
  } else {
    console.log(`⚠️ لم يتم إرسال Geolocation من Frontend`);
  }

  // إذا كان الدور admin، إنشاء صيدلية له تلقائياً
  if (newUser.role === userRoles.ADMIN) {
    // تمرير position من User للصيدلية
    await createPharmacyForAdmin(newUser);
  }

  // Generate JWT token
  const userToken = jwt.sign(
    { id: newUser._id, email: newUser.email, role: newUser.role, image: newUser.avatar },
    process.env.JWT_SECRET_KEY,
    { expiresIn: '24h' }
  );

  newUser.token = userToken;
  await newUser.save();

  res.status(201).json({
    status: httpStatus.success,
    data: { 
      token: userToken,
      user: {
        _id: newUser._id,
        firstname: newUser.firstname,
        lastname: newUser.lastname,
        email: newUser.email,
        role: newUser.role,
        address: newUser.address,
        position: newUser.position,  // ✅ إرجاع الموقع
        pharmacyId: newUser.pharmacyId || null
      }
    },
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
    data: { token: userToken },
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
   🔹 Get Current User Profile (read-only)
========================= */
const getProfile = asyncWrapper(async (req, res, next) => {
  const id = req.currentUser && req.currentUser.id;
  if (!id) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    return next(error);
  }

  const user = await Users.findById(id, { __v: 0, password: 0 });
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    return next(error);
  }

  const profile = {
    _id: user._id,
    firstname: user.firstname,
    lastname: user.lastname,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    position: user.position,  // ✅ إضافة الموقع
    avatar: user.avatar,
  };

  res.json({ status: httpStatus.success, data: { user: profile } });
});

/* =========================
   🔹 Update Current Authenticated User (profile)
========================= */
const updateProfile = asyncWrapper(async (req, res, next) => {
  const id = req.currentUser && req.currentUser.id;
  if (!id) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    return next(error);
  }

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
   🔹 Update User (admin)
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

  const user = await Users.findById(id);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }

  // إذا تم تغيير الـ role إلى admin وكان المستخدم ليس لديه صيدلية
  if (updateData.role === userRoles.ADMIN && user.role !== userRoles.ADMIN) {
    // تحديث المستخدم أولاً
    user.set(updateData);
    // ثم إنشاء الصيدلية
    await createPharmacyForAdmin(user);
  } else {
    // تحديث عادي بدون إنشاء صيدلية
    Object.assign(user, updateData);
    await user.save();
  }

  const updatedUser = await Users.findById(id);

  res.json({ status: httpStatus.success, data: { user: updatedUser } });
});

/* =========================
   🔹 Add Conversation
========================= */
const addConversation = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const conversation = req.body;

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
  getProfile,
  updateProfile,
  updateUser,
  deleteUser,
  addConversation,
  updatePreferences,
};
