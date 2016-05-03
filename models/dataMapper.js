"use strict"

var mongoose = require('mongoose');
var constants = require('../constants');
var MongooseEntityError = require('../errors/mongooseEntityError');

var _schemas = new WeakMap();
var _domainModels = new WeakMap();
var _mongooseModels = new WeakMap();

module.exports = class {
    constructor(schema, model, name = model && model.name) {
        if(!(schema instanceof mongoose.Schema)){
            throw new MongooseEntityError(constants.schemaIsNotAnMongoose);
        }
        if(!model){
            throw new MongooseEntityError(constants.modelDoesNotExists);
        }
        if(!name){
            throw new MongooseEntityError(constants.entityNameIsIncorrect);
        }
        _schemas.set(this, schema);
        _domainModels.set(this, model);
        _mongooseModels.set(this, mongoose.model(name, schema));
    }
    
    get schema(){
        return _schemas.get(this);
    }
    get domainModel(){
        return _domainModels.get(this);
    }
    get mongooseModel(){
        return _mongooseModels.get(this);
    }
}