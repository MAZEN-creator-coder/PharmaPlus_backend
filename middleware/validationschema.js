const { body } = require('express-validator');
const validationSchema = () => {
    return [
        body('title')
            .notEmpty()
            .withMessage("title required")
            .isLength({ min: 3, max: 20 })
            .withMessage("title must be between 3 and 20 characters")
            .escape(),
        body('price')
            .isNumeric()
            .withMessage("price must be a number")
            .notEmpty()
            .withMessage("price required")
            .isLength({ min: 3, max: 20 })
            .withMessage("price must be between 3 and 20 characters")
            .escape(),
        body('description')
            .notEmpty()
            .withMessage("description required")
            .isLength({ min: 10, max: 200 })
            .withMessage("description must be between 10 and 200 characters")
            .escape()
    ]


}
const valitionforubdate = () => {
    return [
        body('title')
            .optional()
            .notEmpty()
            .withMessage("title required")
            .isLength({ min: 3, max: 20 })
            .withMessage("title must be between 3 and 20 characters")
            .escape(),
        body('price')
            .optional()
            .isNumeric()
            .withMessage("price must be a number")
            .notEmpty()
            .withMessage("price required")
            .isLength({ min: 3, max: 20 })
            .withMessage("price must be between 300 and up to 100000 pound")
            .escape()]

}
module.exports = {
    validationSchema,
    valitionforubdate
};