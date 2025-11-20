// controllers/dashboard.controller.js
const { getDashboardData } = require("../services/analytics_super.service");
const asyncWrapper = require("../middleware/asyncwrapper");

const getDashboardController = asyncWrapper(async (req, res) => {
  try {
    const data = await getDashboardData();

    return res.status(200).json({
      status: "success",
      data: data
    });

  } catch (err) {
    console.error("Error in getDashboardController:", err);
    const error = new Error("Failed to fetch dashboard data");
    error.statusCode = 500;
    throw error;
  }
});

module.exports = { getDashboardController };
