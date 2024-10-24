const { CustomAPIError } = require('../errors');
const { statusCodes } = require('../constants');

const errorHandlerMiddleware = (err, req, res, next) => {
    if (err instanceof CustomAPIError) {
        return res.status(err.statusCode).json({ msg: err.message });
    }
    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({ msg: 'Something went wrong, please try again' });
};

module.exports = errorHandlerMiddleware;