const express = require('express');
const path=require('path');
const cors=require('cors');
const httpstatustext=require('./utilities/httpstatustext');
//routers
const usersRouter = require("./routs/users.rout");
const orderRoutes = require("./routs/orders.rout");
const medicineRoutes = require("./routs/medicines.rout");
const pharmacyRoutes = require("./routs/pharmacies.rout");
const fs = require('fs');
// Load .env from backend folder if present, otherwise fall back to parent workspace .env
const envPathLocal = path.join(__dirname, '.env');
const envPathRoot = path.join(__dirname, '..', '.env');
const dotenvPath = fs.existsSync(envPathLocal) ? envPathLocal : envPathRoot;
require('dotenv').config({ path: dotenvPath });
const app = express();
app.use(cors());

app.use(express.json());


app.use('/uploads',express.static(path.join(__dirname,'uploads')));

//connection to mongodb
const mongoose=require('mongoose');
mongoose.connect(process.env.MONGO_URL)
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((error) => {
    console.error('Error connecting to MongoDB:', error.message);
});

//middlewares of routers
app.use("/api/users",usersRouter);
app.use("/api/orders",orderRoutes);
app.use("/api/medicines",medicineRoutes);
app.use("/api/pharmacies",pharmacyRoutes);

// handling other routes by jsend
//and to handle unfound routes
app.all(/.*/, (req, res) => {
    res.status(404).json({
        status: httpstatustext.error,
        data: { msg: "route not found" }
    });
});

// global error handling middleware
//we put err in the first parameter because we send it in asyncwrapper by next() method
app.use((err, req, res, next) => {
    res.status(err.statusCode||500).json({
        status: httpstatustext.error,
        data: { msg: err.message }
    });
});



app.listen(process.env.PORT, () => {
    console.log("Server is running on port 3000");
    console.log(`http://localhost:${process.env.PORT}`);
});