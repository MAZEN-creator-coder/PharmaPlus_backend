const httpStatus = require("../utilities/httpstatustext");
const Users = require("../models/user.model");
const Pharmacy = require("../models/pharmacy.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRoles = require("../utilities/userRoles");
const locationService = require("../services/location.service");

const createPharmacyForAdmin = async (user) => {
  try {
    let pharmacyData = {
      name: `${user.fullName}'s Pharmacy`,
      contact: user.phone || "",
      email: user.email,
      license: user.license,
      status: "inactive",
      managerId: user._id,
    };

    if (user.address) {
      pharmacyData.address = user.address;
    }

    if (user.position && user.position.lat && user.position.lng) {
      pharmacyData.position = user.position;
      console.log(
        `✅ تم استخدام Geolocation من User: lat=${user.position.lat}, lng=${user.position.lng}`
      );
    } else if (user.address) {
      console.log(
        `📍 جاري حساب موقع الصيدلية من عنوان المستخدم: ${user.address}`
      );

      const position = await locationService.getPositionForAddress(
        user.address
      );

      if (position) {
        pharmacyData.position = position;
        console.log(
          `✅ تم حساب الموقع من العنوان: lat=${position.lat}, lng=${position.lng}`
        );
      } else {
        console.log(`⚠️ لم يتم حساب الموقع من العنوان`);
      }
    } else {
      console.log(`⚠️ لا توجد بيانات موقع (بدون Geolocation وبدون عنوان)`);
    }

    const pharmacy = await Pharmacy.create(pharmacyData);

    user.pharmacyId = pharmacy._id;
    await user.save();

    console.log(
      `✅ تم إنشاء صيدلية للـ Admin: ${user.email} مع الترخيص: ${user.license}`
    );
    return pharmacy;
  } catch (error) {
    console.error("Error creating pharmacy for admin:", error);
    throw error;
  }
};

// ubdate common data in case of user is admin and has pharmacy
const updateCommonData = async (source, type) => {
  let user, pharmacy;

  // ============ CASE 1: UPDATE FROM USER ===============
  if (type === "user") {
    user = source;

    // لازم يكون Admin وصاحب صيدلية
    if (user.role !== "admin" || !user.pharmacyId) return;

    pharmacy = await Pharmacy.findById(user.pharmacyId);
    if (!pharmacy) return;

    // المزامنة
    if (user.phone !== undefined) pharmacy.contact = user.phone;
    if (user.address !== undefined) pharmacy.address = user.address;
    if (user.position !== undefined) pharmacy.position = user.position;
    if (user.license !== undefined) pharmacy.license = user.license;
    if (user.email !== undefined) pharmacy.email = user.email;

    if (user.fullName !== undefined) pharmacy.name = user.fullName;

    await pharmacy.save();
  }

  // ============ CASE 2: UPDATE FROM PHARMACY ===============
  if (type === "pharmacy") {
    pharmacy = source;

    if (!pharmacy.managerId) return;

    user = await Users.findById(pharmacy.managerId);
    if (!user || user.role !== "admin") return;

    if (pharmacy.contact !== undefined) user.phone = pharmacy.contact;
    if (pharmacy.address !== undefined) user.address = pharmacy.address;
    if (pharmacy.position !== undefined) user.position = pharmacy.position;
    if (pharmacy.license !== undefined) user.license = pharmacy.license;
    if (pharmacy.email !== undefined) user.email = pharmacy.email;

    if (pharmacy.name !== undefined) user.fullName = pharmacy.name;

    await user.save();
  }
};

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
    address,
    latitude,
    longitude,
    license,
  } = req.body;

  const existingUser = await Users.findOne({ email });
  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 400;
    return next(error);
  }

  if (role === userRoles.ADMIN && !license) {
    const error = new Error("License is required for admin registration");
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
    joined: joined || new Date().toISOString().split("T")[0],
    avatar: `uploads/${filename}`,
    address: address || null,
    license: role === userRoles.ADMIN ? license : null,
    preferences: {
      newsletter: true,
      smsAlerts: false,
    },
    conversations: [],
  });

  if (latitude && longitude) {
    newUser.position = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude),
    };
    console.log(`✅ تم حفظ Geolocation: lat=${latitude}, lng=${longitude}`);
  } else {
    console.log(`⚠️ لم يتم إرسال Geolocation من Frontend`);
  }

  if (newUser.role === userRoles.ADMIN) {
    await createPharmacyForAdmin(newUser);
  }

  // Generate JWT token
  const userToken = jwt.sign(
    {
      id: newUser._id,
      email: newUser.email,
      role: newUser.role,
      image: newUser.avatar,
      pharmacyId: newUser.pharmacyId || null,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "24h" }
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
        position: newUser.position,
        license: newUser.license || null,
        pharmacyId: newUser.pharmacyId || null,
      },
    },
  });
});

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
    {
      id: existingUser._id,
      email: existingUser.email,
      role: existingUser.role,
      image: existingUser.avatar,
      pharmacyId: existingUser.pharmacyId || null,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "1h" }
  );

  existingUser.token = userToken;
  await existingUser.save();

  res.json({
    status: httpStatus.success,
    data: { token: userToken },
  });
});

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

const getProfile = asyncWrapper(async (req, res, next) => {
  const id = req.currentUser && req.currentUser.id;
  if (!id) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    return next(error);
  }

  const user = await Users.findById(id, { __v: 0, password: 0 });
  if (!user) {
    const error = new Error("User not found");
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
    position: user.position,
    avatar: user.avatar,
    role: user.role,
    license: user.license || null,
    pharmacyId: user.pharmacyId || null,
  };

  res.json({ status: httpStatus.success, data: { user: profile } });
});

const updateProfile = asyncWrapper(async (req, res, next) => {
  const id = req.currentUser && req.currentUser.id;
  if (!id) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    return next(error);
  }

  const updateData = { ...req.body };

  if (req.file) {
    updateData.avatar = `uploads/${req.file.filename}`;
  }

  if (updateData.firstname || updateData.lastname) {
    updateData.fullName = `${updateData.firstname || ""} ${
      updateData.lastname || ""
    }`.trim();
  }

  const updatedUser = await Users.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });
  if (!updatedUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }

  res.json({ status: httpStatus.success, data: { user: updatedUser } });
});

const updateUser = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  if (req.file) {
    updateData.avatar = `uploads/${req.file.filename}`;
  }

  if (updateData.firstname || updateData.lastname) {
    updateData.fullName = `${updateData.firstname || ""} ${
      updateData.lastname || ""
    }`.trim();
  }

  const user = await Users.findById(id);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }

  if (updateData.role === userRoles.ADMIN && user.role !== userRoles.ADMIN) {
    if (!user.license) {
      const error = new Error("User must have a license to become an admin");
      error.statusCode = 400;
      return next(error);
    }

    const existingPharmacy = await Pharmacy.findOne({ managerId: id });

    if (existingPharmacy) {
      user.set(updateData);
      user.pharmacyId = existingPharmacy._id;

      if (updateData.license) {
        await Pharmacy.findByIdAndUpdate(existingPharmacy._id, {
          license: updateData.license,
        });
      }

      console.log(
        `✅ تم ربط الـ User ${id} بـ الصيدلية الموجودة: ${existingPharmacy._id}`
      );
    } else {
      user.set(updateData);
      await createPharmacyForAdmin(user);
      console.log(`✅ تم إنشاء صيدلية جديدة للـ User ${id}`);
    }
  } else if (updateData.role === userRoles.ADMIN && updateData.license) {
    Object.assign(user, updateData);

    if (user.pharmacyId) {
      await Pharmacy.findByIdAndUpdate(user.pharmacyId, {
        license: updateData.license,
      });
    }

    await user.save();
    
  } else {
    if (updateData.license) {
      delete updateData.license;
    }
    Object.assign(user, updateData);
    await user.save();
    await updateCommonData(user, "user");
  }

  const updatedUser = await Users.findById(id, { __v: 0, password: 0 });

  res.json({ status: httpStatus.success, data: { user: updatedUser } });
});

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

  res.json({
    status: httpStatus.success,
    data: { conversations: user.conversations },
  });
});

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

  res.json({
    status: httpStatus.success,
    data: { preferences: user.preferences },
  });
});

const deleteUser = asyncWrapper(async (req, res, next) => {
  const { id } = req.params;
  //delete assotiated farmacy if admin
  const userToDelete = await Users.findById(id);
  if (
    userToDelete &&
    userToDelete.role === "admin" &&
    userToDelete.pharmacyId
  ) {
    const pharmacy = await Pharmacy.findById(userToDelete.pharmacyId);
    if (pharmacy) {
      //delete associated medicines
      const associatedMedicines = await Medicine.find({
        pharmacy: pharmacy._id,
      });
      if (associatedMedicines.length > 0) {
        for (const medicine of associatedMedicines) {
          await Medicine.findByIdAndDelete(medicine._id);
        }
      }
      await Pharmacy.findByIdAndDelete(pharmacy._id);
    }
  }
  const user = await Users.findByIdAndDelete(id);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    return next(error);
  }
  res.json({
    status: httpStatus.success,
    message: "User deleted successfully",
  });
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
