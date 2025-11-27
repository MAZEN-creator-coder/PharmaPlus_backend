const fs = require("fs");
const path = require("path");
// Load .env from backend folder if present, otherwise fall back to parent workspace .env
const envPathLocal = path.join(__dirname, ".env");
const envPathRoot = path.join(__dirname, "..", ".env");
const dotenvPath = fs.existsSync(envPathLocal) ? envPathLocal : envPathRoot;
require("dotenv").config({ path: dotenvPath });
console.log(`Loaded env from: ${dotenvPath}`);
const express = require("express");
const cors = require("cors");
const httpstatustext = require("./utilities/httpstatustext");
//routers
const usersRouter = require("./routs/users.rout");
const orderRoutes = require("./routs/orders.rout");
const medicineRoutes = require("./routs/medicines.rout");
const pharmacyRoutes = require("./routs/pharmacies.rout");
const dashboardRoutes = require("./routs/analytics_suepr.rout");
const prescriptionRoutes = require("./routs/prescription.rout");
const app = express();
app.use(cors());

app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//connection to mongodb
const mongoose = require("mongoose");
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error.message);
  });

//middlewares of routers
app.use("/api/users", usersRouter);
app.use("/api/orders", orderRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/pharmacies", pharmacyRoutes);
app.use("/api/analytics-super", dashboardRoutes);
app.use("/api/prescription", prescriptionRoutes);
// utils routes were removed (debug / test routes removed by request)

// handling other routes by jsend
//and to handle unfound routes
app.all(/.*/, (req, res) => {
  res.status(404).json({
    status: httpstatustext.error,
    data: { msg: "route not found" },
  });
});

// global error handling middleware
//we put err in the first parameter because we send it in asyncwrapper by next() method
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    status: httpstatustext.error,
    data: { msg: err.message },
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server is running on port 3000");
  console.log(`http://localhost:${port}`);
});
