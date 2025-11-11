const jwt = require('jsonwebtoken');
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if(!authHeader){
        const error = new Error("No token provided, authorization denied");
        error.statusCode = 401;
        return next(error);
    }
    const token =  authHeader.split(' ')[1]; // Bearer <token>
    try {
   const decodedToken = jwt.verify(token, process.env.JWT_SECRET_KEY);// if token not valid it will throw error
   req.currentUser = decodedToken;
    next();
    } catch (error) {
        error.message = "Invalid or expired token please login agian";
        error.statusCode = 401;
        return next(error);
    }
}
module.exports = verifyToken;