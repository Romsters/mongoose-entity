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
            var mongooseModel = dataMapper.mongooseModel;
            var domainModel = dataMapper.domainModel;
            let refs = new Map();
            for(let key in dataMapper.schema.paths){
                let path = dataMapper.schema.paths[key];
                let options = path.options;
                let ref = options.ref || (options.type[0] && options.type[0].ref);
                if(!(typeof ref === 'string')) continue;
                let mapper = dataMappers.find(mapper => mapper.mongooseModel.modelName === ref);
                if(!mapper) continue;
                let setName = mapper.mongooseModel.collection.collectionName;
                refs.set(path.path, setName);
            }
            let dataSet = new DataSet(mongooseModel, domainModel, refs, this);
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