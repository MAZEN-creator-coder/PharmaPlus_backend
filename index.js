const express = require('express');
const path=require('path');
const cors=require('cors');
const httpstatustext=require('./utilities/httpstatustext');

require('dotenv').config();
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

//routers
const usersRouter = require("./routs/users.rout");
app.use("/api/users",usersRouter);


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