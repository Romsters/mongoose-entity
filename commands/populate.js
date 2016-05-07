"use strict";

var MongooseEntityError = require('../errors/mongooseEntityError');

module.exports = {
    *one(dataSet, entity, options){
        return yield* populate({
            dataSet, entity, options
        });
    },
    *many(dataSet, creteria, options){
        return yield* populate({
            dataSet, creteria, options
        });
    }
}

function* populate(data){
    var dataSet = data.dataSet;
    var options = data.options;
    var entity = data.entity;
    var criteria = data.criteria;
    throwIfDataSetIsInvalid(dataSet);
    entity && dataSet.throwIfNotAppropriateInstance(entity);
    var _options = null;
    if(typeof options === 'string'){
        _options = options;
    } else if(typeof options === 'object'){
        _options = Object.assign({}, options);
    }
    if(!setFields(dataSet, entity || {}, _options)){
        return entity || {};
    } else {
        let MongooseModel = dataSet.mongooseModel;
        try{
            if(entity){
                let mongooseEntity = yield MongooseModel.findOne({ _id: entity._id }).populate(_options);
                return fillEntity(dataSet, entity, mongooseEntity, _options);
            } else {
                let mongooseEntities = yield MongooseModel.find(criteria).populate(_options);
                return fillEntities(dataSet, mongooseEntities, _options);
            }
        } catch(e){
            dataSet.throwQueryFailed('populate');
        }
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
    for(let mongooseEntity of mongooseEntities){
        let loadedData = fillEntity(dataSet, {}, mongooseEntity, options);
        pushLoadedData(mongooseEntity, loadedData);
    }
    return mongooseEntities.map(item => new Model(item));
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
        Object.defineProperty(source, key, {
            get(){
                return loadedData[key];
            }
        });
    }
}

function setFields(dataSet, entity, options){
    var deep = isDeepPopulate(options);
    var fields = getFields(options);
    if(!fields || !fields.length){
        throwPopulateOptionsInvalid();
    }
    var context = dataSet.dataContext;
    var refs = dataSet.refs;
    var notLoadedFields = [];
    for(let field of fields){
        let setName = refs.get(field);
        let Model = context[setName] && context[setName].domainModel;
        dataSet.throwIfInvalidDomainModel(Model);
        if(entity[field] && (entity[field] instanceof Model) || entity[field][0] instanceof Model){
            continue;
        }
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