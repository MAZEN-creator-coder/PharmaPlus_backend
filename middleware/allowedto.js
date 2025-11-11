module.exports=(...roles)=>{
    return (req,res,next)=>{
        if(!roles.includes(req.currentUser.role)){
            const error = new Error("You are not allowed to access this route");
            error.statusCode = 403;
            return next(error);
        }
        next();
}
}
