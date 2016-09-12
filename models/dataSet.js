"use strict";

var MongooseEntity = require('./mongooseEntity');
var MongooseEntityError = require('../errors/mongooseEntityError');
var populate = require('../commands/populate');

var _mongooseModel = new WeakMap();
var _domainModel = new WeakMap();
var _refs = new WeakMap();
var _contexts = new WeakMap();

module.exports = class {
    constructor(MongooseModel, DomainModel, refs, dataContext){
        this.throwIfNullOrNotDefined('MongooseModel', MongooseModel);
        this.throwIfNullOrNotDefined('DomainModel', DomainModel);
        this.throwIfInvalidDomainModel(DomainModel);
        this.throwIfRefsAreInvalid(refs);
        this.throwIfDataContextIsInvalid(dataContext);
        
        _mongooseModel.set(this, MongooseModel);
        _domainModel.set(this, DomainModel);
        _refs.set(this, refs);
        _contexts.set(this, dataContext);
    }
    get mongooseModel(){
        return _mongooseModel.get(this);
    }
    get domainModel(){
        return _domainModel.get(this);
    }
    get refs(){
        return _refs.get(this);
    }
    get dataContext(){
        return _contexts.get(this);
    }
    *count(conditions){
        return yield this.mongooseModel.count(conditions);
    }
    *distinct(field, query){
        return yield this.mongooseModel.distinct(field, query);
    }
    *insertMany(entities){
        for(let entity of entities){
            this.throwIfNotAppropriateInstance(entity);
        }
        return yield this.mongooseModel.insertMany(entities);
    }
    *save(entity){
        this.throwIfNotAppropriateInstance(entity);
        try{
            return yield this.mongooseModel.update({ _id: entity._id }, this.getMongooseEntity(entity), { upsert: true });
        } catch(e){
            this.throwQueryFailed('save');
        }
    }
    *remove(entity){
        this.throwIfNotAppropriateInstance(entity);
        try{
            return yield this.mongooseModel.remove({ _id: entity._id });
        } catch(e){
            this.throwQueryFailed('remove');
        }
    }
    *findOne(criteria, projection){
        var entity = yield this.mongooseModel.findOne(criteria, projection);
        return entity ? projection ? entity : new this.domainModel(entity): null;
    }
    *find(criteria, fields, options){
        var collection = yield this.mongooseModel.find(criteria, fields, options);
        return fields ? collection : collection.map(entity => new this.domainModel(entity));
    }
    *findAndUpdate(conditions, doc, options){
        try{
            return yield this.mongooseModel.update(conditions, doc, options);
        } catch(e){
            this.throwQueryFailed('findAndUpdate');
        }
    }
    *findAndRemove(criteria){
        try{
            return yield this.mongooseModel.remove(criteria);
        } catch(e){
            this.throwQueryFailed('findAndRemove');
        }
    }
    *populate(entities, options){ // fields
        return yield* populate.instance(this, entities, options);
    }
    *populateMany(entities, options){
        if(!entities || entities.length < 1) {
            return entities;
        }
        var result = [];
        for(let entity of entities) {
            result.push(yield* this.populate(entity, options));
        }
        return result;
    }
    *findAndPopulate(criteria, options){
        return yield* populate.criteria(this, criteria, options);
    }
    *findOneAndPopulate(criteria, options){
        return yield* populate.criteria(this, criteria, options, true);
    }
    
    getMongooseEntity(entity){
        var modelKeys = Object.keys(this.mongooseModel.schema.paths).filter(key => key !== this.mongooseModel.schema.options.versionKey);
        var mongooseEntity = {};
        for(let key of modelKeys){
            mongooseEntity[key] = entity[key];
        }
        return mongooseEntity;
    }
    
    throwQueryFailed(action){
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
    throwIfNotAppropriateInstance(entity){
        if(!(entity instanceof this.domainModel)){
            throw new MongooseEntityError('entity is not an instance of appropriate Model');
        }
    }
    throwIfRefsAreInvalid(refs){
        if(!(refs instanceof Map)){
            throw new MongooseEntityError('refs should be a map');
        }
    }
    throwIfDataContextIsInvalid(dataContext){
        if(!(typeof dataContext === 'object')){
            throw new MongooseEntityError('dataContext should be an object');
        }
    }
}