const httpStatus = require("../utilities/httpstatustext");
const Users = require("../models/user.model");
const Pharmacy = require("../models/pharmacy.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userRoles = require("../utilities/userRoles");
const locationService = require("../services/location.service");
const crypto = require("crypto");
const emailService = require("../services/email.service");

// Function to create an associated pharmacy for a newly registered admin user
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

    // Attempt to use Geolocation data if provided
    if (user.position && user.position.lat && user.position.lng) {
      pharmacyData.position = user.position;
      console.log(
        `✅ Geolocation used from User: lat=${user.position.lat}, lng=${user.position.lng}`
      );
    } else if (user.address) {
      // If no Geolocation, calculate position from address
      console.log(
        `📍 Calculating pharmacy location from user address: ${user.address}`
      );

      const position = await locationService.getPositionForAddress(
        user.address
      );

      if (position) {
        pharmacyData.position = position;
        console.log(
          `✅ Location calculated from address: lat=${position.lat}, lng=${position.lng}`
        );
      } else {
        console.log(`⚠️ Failed to calculate location from address`);
      }
    } else {
      console.log(`⚠️ No location data available (no Geolocation or address)`);
    }

    const pharmacy = await Pharmacy.create(pharmacyData);

    user.pharmacyId = pharmacy._id;
    await user.save();

    console.log(
      `✅ Pharmacy created for Admin: ${user.email} with license: ${user.license}`
    );
    return pharmacy;
  } catch (error) {
    console.error("Error creating pharmacy for admin:", error);
    throw error;
  }
};

// Update common data in case the user is an admin and manages a pharmacy (synchronization)
const updateCommonData = async (source, type) => {
  let user, pharmacy;

  // ============ CASE 1: UPDATE FROM USER ===============
  if (type === "user") {
    user = source;

    // Must be Admin and have a pharmacy
    if (user.role !== "admin" || !user.pharmacyId) return;

    pharmacy = await Pharmacy.findById(user.pharmacyId);
    if (!pharmacy) return;

    // Synchronization
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

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const filename = req.file?.filename || "avatar.webp";

  // ========== Create Verification Token ==========
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

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
    // ========== Verification fields ==========
    isEmailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationExpires: verificationExpires,
  });

  if (latitude && longitude) {
    newUser.position = {
      lat: parseFloat(latitude),
      lng: parseFloat(longitude),
    };
    console.log(`✅ Geolocation saved: lat=${latitude}, lng=${longitude}`);
  }

  if (newUser.role === userRoles.ADMIN) {
    await createPharmacyForAdmin(newUser);
  }

  await newUser.save();

  // ========== Send Email Verification ==========
  try {
    await emailService.sendVerificationEmail(newUser, verificationToken);
    console.log(`✅ Confirmation email sent to: ${newUser.email}`);
  } catch (emailError) {
    console.error("Error sending confirmation email:", emailError);
    // Continue even if email fails
  }

  // Note: We don't send a token here - the user must verify their email first
  res.status(201).json({
    status: httpStatus.success,
    message:
      "Registration successful. Please check your email to confirm your account",
    data: {
      user: {
        _id: newUser._id,
        firstname: newUser.firstname,
        lastname: newUser.lastname,
        email: newUser.email,
        role: newUser.role,
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

  // ========== Check email verification ==========
  if (!existingUser.isEmailVerified) {
    const error = new Error("Please confirm your email address first");
    error.statusCode = 403;
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
    { expiresIn: "24h" }
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

  // -----------------------
  // Check email uniqueness
  // -----------------------
  if (updateData.email && updateData.email !== user.email) {
    const existingUser = await Users.findOne({ email: updateData.email });
    if (existingUser) {
      const error = new Error("Email is already in use");
      error.statusCode = 400;
      return next(error);
    }
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
        `✅ User ${id} linked to existing Pharmacy: ${existingPharmacy._id}`
      );
    } else {
      user.set(updateData);
      await createPharmacyForAdmin(user);
      console.log(`✅ New pharmacy created for User ${id}`);
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
  //delete associated pharmacy if admin
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

const verifyEmail = asyncWrapper(async (req, res, next) => {
  const { token } = req.params;

  const user = await Users.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    const error = new Error("Verification link is invalid or expired");
    error.statusCode = 400;
    return next(error);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  // Create a login token now that the email has been verified so the user can be logged in immediately.
  const userToken = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      image: user.avatar,
      pharmacyId: user.pharmacyId || null,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "24h" }
  );

  user.token = userToken;
  await user.save();

  res.json({
    status: httpStatus.success,
    message: "Email confirmed successfully! You can now log in",
    data: { token: userToken },
  });
});

// Resend verification link
const resendVerification = asyncWrapper(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    return next(error);
  }

  const user = await Users.findOne({ email });
  if (!user) {
    const error = new Error("No user found with this email address");
    error.statusCode = 404;
    return next(error);
  }

  if (user.isEmailVerified) {
    const error = new Error("Email is already verified");
    error.statusCode = 400;
    return next(error);
  }

  // Create new token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpires = Date.now() + 24 * 60 * 60 * 1000;

  user.emailVerificationToken = verificationToken;
  user.emailVerificationExpires = verificationExpires;
  await user.save();

  // Send email
  try {
    await emailService.sendVerificationEmail(user, verificationToken);
    console.log(`✅ Confirmation email resent to: ${user.email}`);
  } catch (emailError) {
    console.error("Error sending email:", emailError);
    const error = new Error("Failed to send email");
    error.statusCode = 500;
    return next(error);
  }

  res.json({
    status: httpStatus.success,
    message: "Confirmation link has been resent to your email address",
  });
});

// Request password reset
const forgotPassword = asyncWrapper(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    return next(error);
  }

  const user = await Users.findOne({ email });
  if (!user) {
    const error = new Error("No user found with this email address");
    error.statusCode = 404;
    return next(error);
  }

  // Create reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetExpires = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = resetExpires;
  await user.save();

  // Send email
  try {
    await emailService.sendPasswordResetEmail(user, resetToken);
    console.log(`✅ Reset email sent to: ${user.email}`);
  } catch (emailError) {
    console.error("Error sending email:", emailError);
    const error = new Error("Failed to send email");
    error.statusCode = 500;
    return next(error);
  }

  res.json({
    status: httpStatus.success,
    message: "Password reset link has been sent to your email address",
  });
});

// Reset password
const resetPassword = asyncWrapper(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    const error = new Error("New password is required");
    error.statusCode = 400;
    return next(error);
  }

  const user = await Users.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    const error = new Error("Reset link is invalid or expired");
    error.statusCode = 400;
    return next(error);
  }

  // Hash the new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  user.password = hashedPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({
    status: httpStatus.success,
    message: "Password changed successfully! You can now log in",
  });
});

// ============================================================
// Update module.exports - replace existing line with this
// ============================================================
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
  // ========== New functions ==========
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};