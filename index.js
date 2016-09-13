"use strict";

var mongoose = require('mongoose');
mongoose.Promise = Promise;

var MongooseEntity = require('./models/mongooseEntity');
var DataModel = require('./models/dataModel');
var DataContext = require('./models/dataContext');

module.exports = {
    mongoose,
    MongooseEntity,
    DataModel,
    DataContext
};