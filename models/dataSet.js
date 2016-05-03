"use strict";

var MongooseEntity = require('./mongooseEntity');
var MongooseEntityError = require('../errors/mongooseEntityError');

var _mongooseModel = new WeakMap();
var _domainModel = new WeakMap();
var _refs = new WeakMap();

module.exports = class {
    constructor(MongooseModel, DomainModel, refs){
        this.throwIfNullOrNotDefined('MongooseModel', MongooseModel);
        this.throwIfNullOrNotDefined('DomainModel', DomainModel);
        this.throwIfInvalidDomainModel(DomainModel);
        this.throwIfRefsAreInvalid(refs);
        
        _mongooseModel.set(this, MongooseModel);
        _domainModel.set(this, DomainModel);
        _refs.set(this, refs);
    }
    
    *save(entity){
        this.throwIfNotAppropriateInstance(entity, _domainModel.get(this));
        var MongooseModel = _mongooseModel.get(this);
        try{
            return yield MongooseModel.update({ _id: entity._id }, this.getMongooseEntity(entity), { upsert: true });
        } catch(e){
            this.throwQueryFailed('save');
        }
    }
    *remove(entity){
        this.throwIfNotAppropriateInstance(entity, _domainModel.get(this));
        var MongooseModel = _mongooseModel.get(this);
        try{
            return yield MongooseModel.remove({ _id: entity._id });
        } catch(e){
            this.throwQueryFailed('remove');
        }
    }
    *populate(entity, path){
        this.throwIfNotAppropriateInstance(entity, _domainModel.get(this));
        var refs = _refs.get(this);
        var Constructor = refs.get(path);
        this.throwIfInvalidDomainModel(Constructor);
        var MongooseModel = _mongooseModel.get(this);
        if(entity[path] instanceof Constructor){
            return entity;
        }
        if(entity[path] && entity[path][0] instanceof Constructor){
            return entity;
        }
        try{
            let mongooseEntity = yield MongooseModel.findOne({ _id: entity._id }).populate(path);
            if(!mongooseEntity[path]){
                return entity;
            }
            var value = null;
            if(mongooseEntity[path].length){
                value = mongooseEntity[path].map(item => new Constructor(item));
            } else {
                value = new Constructor(mongooseEntity[path]);
            }
            entity[path] = value;
            return entity;
        } catch(e){
            this.throwQueryFailed('populate');
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
            this.throwQueryFailed('findAndUpdate');
        }
    }
    *findAndRemove(criteria){
        var MongooseModel = _mongooseModel.get(this);
        try{
            return yield MongooseModel.remove(criteria);
        } catch(e){
            this.throwQueryFailed('findAndRemove');
        }
    }
    *findAndPopulate(criteria, path){
        var refs = _refs.get(this);
        var Constructor = refs.get(path);
        this.throwIfInvalidDomainModel(Constructor);
        var MongooseModel = _mongooseModel.get(this);
        try{
            var collection = yield MongooseModel.find(criteria).populate(path);
            var DomainModel = _domainModel.get(this);
            for(let entity of collection){
                entity[path] = new Constructor(entity[path]);
            }
            return collection.map(entity => new DomainModel(entity));
        } catch(e){
            this.throwQueryFailed('findAndPopulate');
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
    throwIfNotAppropriateInstance(entity, Model){
        if(!(entity instanceof Model)){
            throw new MongooseEntityError('entity is not an instance of appropriate Model');
        }
    }
    throwIfRefsAreInvalid(refs){
        if(!(refs instanceof Map)){
            throw new MongooseEntityError('refs should be a map');
        }
    }
}