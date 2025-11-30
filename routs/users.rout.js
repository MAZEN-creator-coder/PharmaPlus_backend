const express = require("express");
const controller = require("../controllers/users.controller");
const verifyToken = require("../middleware/verifytoken");
const multer = require("multer");

const deskstorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `user-${Date.now()}.${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    const error = new Error("Only image files are allowed!");
    error.statusCode = 400;
    cb(error, false);
  }
};

const upload = multer({
  storage: deskstorage,
  fileFilter: fileFilter,
});

const router = express.Router();

// ========== Auth Routes ==========
router.post("/register", upload.single("avatar"), controller.register);
router.post("/login", controller.login);

// ========== Email Verification Routes (جديدة) ==========
router.get("/verify-email/:token", controller.verifyEmail);
router.post("/resend-verification", controller.resendVerification);

// ========== Password Reset Routes (جديدة) ==========
router.post("/forgot-password", controller.forgotPassword);
router.post("/reset-password/:token", controller.resetPassword);

// ========== User Routes ==========
router.get("/", verifyToken, controller.getAllUsers);
router.get('/profile', verifyToken, controller.getProfile);
router.put('/profile', verifyToken, upload.single("avatar"), controller.updateProfile);
router.get("/:id", verifyToken, controller.getUserById);
router.put("/:id", verifyToken, upload.single("avatar"), controller.updateUser);
router.delete("/:id", verifyToken, controller.deleteUser);
router.post("/:id/conversations", verifyToken, controller.addConversation);
router.put("/:id/preferences", verifyToken, controller.updatePreferences);

module.exports = router;