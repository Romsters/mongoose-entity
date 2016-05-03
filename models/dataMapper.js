"use strict"

var mongoose = require('mongoose');
var constants = require('../constants');
var MongooseEntityError = require('../errors/mongooseEntityError');

var _schemas = new WeakMap();
var _models = new WeakMap();
var _names = new WeakMap();

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
        _models.set(this, model);
        _names.set(this, name);
    }
    
    get schema(){
        return _schemas.get(this);
    }
    get model(){
        return _models.get(this);
    }
    get name(){
        return _names.get(this);
    }
}