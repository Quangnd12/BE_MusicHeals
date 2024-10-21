const Joi = require('joi');
const { CustomAPIError } = require('../errors');
const { statusCodes } = require('../constants');

const validateSongCreate = (req, res, next) => {
    const schema = Joi.object({
        title: Joi.string().required(),
        artistId: Joi.number().required(),
        albumId: Joi.number(),
        genresId: Joi.number(),
        lyrics: Joi.string(),
        duration: Joi.number(),
        releasedate: Joi.date(),
        is_explicit: Joi.boolean()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        throw new CustomAPIError(error.details[0].message, statusCodes.BAD_REQUEST);
    }
    next();
};

const validateSongUpdate = (req, res, next) => {
    const schema = Joi.object({
        title: Joi.string(),
        artistId: Joi.number(),
        albumId: Joi.number(),
        genresId: Joi.number(),
        lyrics: Joi.string(),
        duration: Joi.number(),
        releasedate: Joi.date(),
        is_explicit: Joi.boolean()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        throw new CustomAPIError(error.details[0].message, statusCodes.BAD_REQUEST);
    }
    next();
};

module.exports = { validateSongCreate, validateSongUpdate };