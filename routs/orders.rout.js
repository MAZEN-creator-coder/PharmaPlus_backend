const express = require("express");
const controller = require("../controllers/order.controller");
const verifyToken = require("../middleware/verifytoken");

const router = express.Router();

router.post("/", verifyToken, controller.createOrder);

router.get("/", verifyToken, controller.getOrders);

router.get("/user/:userId", verifyToken, controller.getOrdersByUser);

router.get("/pharmacy/:pharmacyId", verifyToken, controller.getOrdersByPharmacy);

router.get("/:id", verifyToken, controller.getOrderById);

router.put("/:id/status", verifyToken, controller.updateOrderStatus);

router.delete("/:id", verifyToken, controller.deleteOrder);

module.exports = router;
