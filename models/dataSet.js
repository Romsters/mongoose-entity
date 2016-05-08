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
    *save(entity){
        this.throwIfNotAppropriateInstance(entity);
        var MongooseModel = this.mongooseModel;
        try{
            return yield MongooseModel.update({ _id: entity._id }, this.getMongooseEntity(entity), { upsert: true });
        } catch(e){
            this.throwQueryFailed('save');
        }
    }
    *remove(entity){
        this.throwIfNotAppropriateInstance(entity);
        var MongooseModel = this.mongooseModel;
        try{
            return yield MongooseModel.remove({ _id: entity._id });
        } catch(e){
            this.throwQueryFailed('remove');
        }
    }
    *findOne(criteria){
        var MongooseModel = this.mongooseModel;
        var DomainModel = this.domainModel;
        var entity = yield MongooseModel.findOne(criteria);
        return entity ? new DomainModel(entity): null;
    }
    *find(criteria){
        var MongooseModel = this.mongooseModel;
        var DomainModel = this.domainModel;
        var collection = yield MongooseModel.find(criteria);
        return collection.map(entity => new DomainModel(entity));
    }
    *findAndUpdate(conditions, doc, options){
        var MongooseModel = this.mongooseModel;
        try{
            return yield MongooseModel.update(conditions, doc, options);
        } catch(e){
            this.throwQueryFailed('findAndUpdate');
        }
    }
    *findAndRemove(criteria){
        var MongooseModel = this.mongooseModel;
        try{
            return yield MongooseModel.remove(criteria);
        } catch(e){
            this.throwQueryFailed('findAndRemove');
        }
    }
    *populate(entity, options){
        return yield* populate.instance(this, entity, options);
    }
    *findAndPopulate(criteria, options){
        return yield* populate.criteria(this, criteria, options);
    }
    *findOneAndPopulate(criteria, options){
        return yield* populate.criteria(this, criteria, options, true);
    }
    
    getMongooseEntity(entity){
        var MongooseModel = this.mongooseModel;
        var modelKeys = Object.keys(MongooseModel.schema.paths).filter(key => key !== '__v');
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