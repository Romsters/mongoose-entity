"use strict";

var MongooseEntityError = require('../errors/mongooseEntityError');

module.exports = function* (dataSet, entity, options) {
    throwIfDataSetIsInvalid(dataSet);
    dataSet.throwIfNotAppropriateInstance(entity);
    var _options = null;
    if(typeof options === 'string'){
        _options = options;
    } else if(typeof options === 'object'){
        _options = Object.assign({}, options);
    } else {
        throwPopulateOptionsInvalid();
    }
    var notLoaded = setFields(dataSet, entity, _options);
    if(!notLoaded){
        return entity;
    } else {
        let MongooseModel = dataSet.mongooseModel;
        try{
            let mongooseEntity = yield MongooseModel.findOne({ _id: entity._id }).populate(_options);
            return fillEntity(dataSet, entity, mongooseEntity, _options);
        } catch(e){
            dataSet.throwQueryFailed('populate');
        }
    }
}

function throwPopulateOptionsInvalid(){
    throw new MongooseEntityError('populate options are invalid');
}

function throwIfDataSetIsInvalid(dataSet) {
    if (!(typeof dataSet === 'object')) {
        throw new MongooseEntityError('dataSet should be an object');
    }
}

function isDeepPopulate(options){
    if(typeof options === 'object' && options.populate){
        return true;
    }
    return false;
}

function fillEntity(dataSet, entity, mongooseEntity, options){
    var fields = null;
    if(typeof options === 'string'){
        fields = options.split(' ');
    } else if(typeof options === 'object'){
        fields = options.path.split(' ');
    } else {
        throwPopulateOptionsInvalid();
    }
    for(let field of fields){
        if(!mongooseEntity[field]){
            continue;
        }
        let value = null;
        let Constructor = dataSet.dataContext[dataSet.refs.get(field)].domainModel;
        if(mongooseEntity[field].length){
            if(options.populate){
                let subDataSet = dataSet.dataContext[dataSet.refs.get(field)];
                for(let item of mongooseEntity[field]){
                    let loadedFields = fillEntity(subDataSet, {}, item, options.populate);
                    for(let key in loadedFields){
                        Object.defineProperty(item, key, {
                            get(){
                                return loadedFields[key];
                            }
                        });
                    }
                }
            }
            value = mongooseEntity[field].map(item => new Constructor(item));
        } else {
            if(options.populate){
                let subDataSet = dataSet.dataContext[dataSet.refs.get(field)];
                let loadedFields = fillEntity(subDataSet, {}, mongooseEntity[field], options.populate);
                for(let key in loadedFields){
                    Object.defineProperty(mongooseEntity[field], key, {
                        get(){
                            return loadedFields[key];
                        }
                    });
                }
            }
            value = new Constructor(mongooseEntity[field]);
        }
        entity[field] = value;
    }
    return entity;
}

function setFields(dataSet, entity, options){
    var deep = isDeepPopulate(options);
    var fields = null;
    if(typeof options === 'string'){
        fields = options.split(' ');
    } else if(typeof options === 'object'){
        fields = options.path && options.path.split(' ');
    } else {
        throwPopulateOptionsInvalid();
    }
    if(!fields || !fields.length){
        throwPopulateOptionsInvalid();
    }
    var context = dataSet.dataContext;
    var refs = dataSet.refs;
    var notLoadedFields = [];
    for(let field of fields){
        let Constructor = context[refs.get(field)] && context[refs.get(field)].domainModel;
        dataSet.throwIfInvalidDomainModel(Constructor);
        if(entity[field] instanceof Constructor){
            continue;
        }
        if(entity[field] && entity[field][0] instanceof Constructor){
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