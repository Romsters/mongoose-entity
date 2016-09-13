"use strict";

var MongooseEntityError = require('../errors/mongooseEntityError');

module.exports = {
    *instance(dataSet, entities, options){
        return yield* populate({
            dataSet, entities, options
        });
    },
    *criteria(dataSet, creteria, options, single){
        return yield* populate({
            dataSet, creteria, options, single
        });
    }
}

function* populate(data){
    var dataSet = data.dataSet;
    var options = data.options;
    var entities = data.entities;
    var criteria = data.criteria;
    var single = data.single;
    
    throwIfDataSetIsInvalid(dataSet);
    if(entities){
        if(entities.length){
            for(let entity of entities){
                dataSet.throwIfNotAppropriateInstance(entity);
            }
        } else {
            dataSet.throwIfNotAppropriateInstance(entities);
        }
    }
    var _options = null;
    if(typeof options === 'string'){
        _options = options;
    } else if(typeof options === 'object'){
        _options = Object.assign({}, options);
    }
    if(!setFields(dataSet, entities || {}, _options)){
        return entities;
    }
    let MongooseModel = dataSet.mongooseModel;
    try{
        if(entities){
            let cond = entities.length ? entities.map(entity => dataSet.getMongooseEntity(entity)) : dataSet.getMongooseEntity(entities);
            let mongooseEntities = yield MongooseModel.populate(cond, _options);
            if(entities.length){
                if(!mongooseEntities || !mongooseEntities.length){
                    return entities;
                }
                for(let mongooseEntity of mongooseEntities){
                    let entity = entities.find(entity => mongooseEntity._id && entity._id === mongooseEntity._id);
                    fillEntity(dataSet, entity, mongooseEntity, options);
                }
                return entities;
            }
            return fillEntity(dataSet, entities, mongooseEntities, _options);
        } 
        let mongooseEntities = null;
        if(single){
            mongooseEntities = yield MongooseModel.findOne(criteria).populate(_options);
        } else {
            mongooseEntities = yield MongooseModel.find(criteria).populate(_options);
        }
        return fillEntities(dataSet, mongooseEntities, _options);
    } catch(e){
        dataSet.throwQueryFailed('populate');
    }
}

function isDeepPopulate(options){
    if(typeof options === 'object' && options.populate){
        return true;
    }
    return false;
}

function fillEntities(dataSet, mongooseEntities, options){
    var Model = dataSet.domainModel;
    if(!mongooseEntities){
        return null;
    }
    else if(mongooseEntities.length){
        for(let mongooseEntity of mongooseEntities){
            let loadedData = fillEntity(dataSet, {}, mongooseEntity, options);
            pushLoadedData(mongooseEntity, loadedData);
        }
        return mongooseEntities.map(item => new Model(item));
    } else {
        let loadedData = fillEntity(dataSet, {}, mongooseEntities, options);
        pushLoadedData(mongooseEntities, loadedData);
        return new Model(mongooseEntities);
    }
}

function fillEntity(dataSet, entity, mongooseEntity, options){
    var fields = getFields(options);
    for(let field of fields){
        let data = mongooseEntity[field];
        if(!data) continue;
        let value = null;
        let subDataSet = dataSet.dataContext[dataSet.refs.get(field)];
        let Model = subDataSet.domainModel;
        if(data.length){
            if(options.populate){
                for(let item of data){
                    let loadedData = fillEntity(subDataSet, {}, item, options.populate);
                    pushLoadedData(item, loadedData);
                }
            }
            value = data.map(item => new Model(item));
        } else {
            if(options.populate){
                let loadedData = fillEntity(subDataSet, {}, data, options.populate);
                pushLoadedData(data, loadedData);
            }
            value = new Model(data);
        }
        entity[field] = value;
    }
    return entity;
}

function pushLoadedData(source, loadedData){
    for(let key in loadedData){
        if(source.hasOwnProperty(key)){
            continue;
        }
        Object.defineProperty(source, key, {
            get(){
                return loadedData[key];
            }
        });
    }
}

function setFields(dataSet, entities, options){
    var deep = isDeepPopulate(options);
    var fields = getFields(options);
    if(!fields || !fields.length){
        throwPopulateOptionsInvalid();
    }
    var context = dataSet.dataContext;
    var refs = dataSet.refs;
    var notLoadedFields = [];
    var _entities = entities.length ? entities : [entities];
    var loaded = true;
    for(let field of fields){
        let setName = refs.get(field);
        let Model = context[setName] && context[setName].domainModel;
        dataSet.throwIfInvalidDomainModel(Model);
        for(let entity of _entities){
            if(!(entity[field] && ((entity[field] instanceof Model) || (entity[field][0] instanceof Model)))){
                loaded = false;
                break;
            }
        }
        if(loaded) continue;
        loaded = true;
        notLoadedFields.push(field);
    }
    if(!deep){
        if(!notLoadedFields.length){
            return false;
        } else {
            if(typeof options === 'string'){
                options = notLoadedFields.join(' ');
            } else {
                options.path = notLoadedFields.join(' ');
            }
            return true;
        }
    } else {
        for(let field of fields){
            let subDataSet = context[refs.get(field)];
            if(!(typeof subDataSet === 'object')){
                throwPopulateOptionsInvalid();
            }
            if(typeof options.populate === 'string'){
                options.populate = {
                    path: options.populate
                }
            }
            setFields(subDataSet, {}, options.populate);
        }
        return true;
    }
}

function getFields(options){
    if(typeof options === 'string'){
        return options.split(' ');
    } else if(typeof options === 'object' && typeof options.path === 'string'){
        return options.path.split(' ');
    }
    throwPopulateOptionsInvalid();
}

function throwPopulateOptionsInvalid(){
    throw new MongooseEntityError('populate options are invalid');
}

function throwIfDataSetIsInvalid(dataSet) {
    if (!(typeof dataSet === 'object')) {
        throw new MongooseEntityError('dataSet should be an object');
    }
}