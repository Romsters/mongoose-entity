"use strict";

var constants = require('../constants');

module.exports = class extends Error {
    constructor(message = constants.errors.default){
        super(message);
        this.name = 'MongooseEntityError';
    }
}