"use strict";

var mongoose = require('mongoose');
var constants = require('../constants');
var DataMapper = require('./dataMapper');
var DataSet = require('./dataSet');
var MongooseEntityError = require('../errors/mongooseEntityError');
var _instances = new Map();

module.exports = class {
    constructor() {
        var className = this.constructor.name || 'default';
        var existingInstance = _instances.get(className);
        if(existingInstance) {
            return existingInstance;
        }
        if(typeof this.init !== 'function') {
            throw new MongooseEntityError(constants.errors.initDoesNotExist);
        }
        var dataMappers = this.init();
        if(!dataMappers || !dataMappers.length) {
            throw new MongooseEntityError(constants.errors.incorrectInitReturnType);
        }
        for(let dataMapper of dataMappers){
            if(!(dataMapper instanceof DataMapper)){
                throw new MongooseEntityError(constants.errors.incorrectInitReturnType);
            }
            var mongooseModel = mongoose.model(dataMapper.name, dataMapper.schema);
            var domainModel = dataMapper.model;
            var dataSet = new DataSet(mongooseModel, domainModel);
            Object.defineProperty(this, mongooseModel.collection.collectionName, {
                get() {
                    return dataSet;
                }
            });
        }
        _instances.set(className, this);
        return this;
    }
}