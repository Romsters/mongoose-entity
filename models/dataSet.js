"use strict";

var MongooseEntity = require('./mongooseEntity');
var MongooseEntityError = require('../errors/mongooseEntityError');

var _mongooseModel = new WeakMap();
var _domainModel = new WeakMap();

module.exports = class {
    constructor(MongooseModel, DomainModel){
        this.throwIfNullOrNotDefined('MongooseModel', MongooseModel);
        this.throwIfNullOrNotDefined('DomainModel', DomainModel);
        this.throwIfInvalidDomainModel(DomainModel);
        
        _mongooseModel.set(this, MongooseModel);
        _domainModel.set(this, DomainModel);
    }
    
    *save(entity){
        this.throwIfNotAppropriateInstance(entity, _domainModel.get(this));
        var MongooseModel = _mongooseModel.get(this);
        try{
            return yield MongooseModel.update({ _id: entity._id }, this.getMongooseEntity(entity), { upsert: true });
        } catch(e){
            this.throwIfQueryFailed('save');
        }
    }
    *remove(entity){
        this.throwIfNotAppropriateInstance(entity, _domainModel.get(this));
        var MongooseModel = _mongooseModel.get(this);
        try{
            return yield MongooseModel.remove({ _id: entity._id });
        } catch(e){
            this.throwIfQueryFailed('remove');
        }
    }
    *find(criteria){
        var MongooseModel = _mongooseModel.get(this);
        var DomainModel = _domainModel.get(this);
        var collection = yield MongooseModel.find(criteria);
        return collection.map(entity => new DomainModel(entity));
    }
    *findOne(criteria){
        var MongooseModel = _mongooseModel.get(this);
        var DomainModel = _domainModel.get(this);
        var entity = yield MongooseModel.findOne(criteria);
        return entity ? new DomainModel(entity): null;
    }
    *findAndUpdate(conditions, doc, options){
        var MongooseModel = _mongooseModel.get(this);
        try{
            return yield MongooseModel.update(conditions, doc, options);
        } catch(e){
            this.throwIfQueryFailed('findAndUpdate');
        }
    }
    *findAndRemove(criteria){
        var MongooseModel = _mongooseModel.get(this);
        try{
            return yield MongooseModel.remove(criteria);
        } catch(e){
            this.throwIfQueryFailed('findAndRemove');
        }
    }
    
    getMongooseEntity(entity){
        var MongooseModel = _mongooseModel.get(this);
        var modelKeys = Object.keys(MongooseModel.schema.paths).filter(key => key !== '__v');
        var mongooseEntity = {};
        for(let key of modelKeys){
            mongooseEntity[key] = entity[key];
        }
        return mongooseEntity;
    }
    
    throwIfQueryFailed(action){
        throw new MongooseEntityError(`failed to ${action} data`);
    }
    throwIfNullOrNotDefined(name, object){
        if(object === null || object === undefined){
            throw new MongooseEntityError(`${name} is null or not defined`);
        }
    }
    throwIfInvalidDomainModel(model){
        if(!MongooseEntity.isPrototypeOf(model)){
            throw new MongooseEntityError('Domain model should extends MongooseEntity');
        }
    }
    throwIfNotAppropriateInstance(entity, Model){
        if(!(entity instanceof Model)){
            throw new MongooseEntityError('entity is not an instance of appropriate Model');
        }
    }
}