"use strict";
var mongoose = require('mongoose');

var DataContext = require('./models/dataContext');
var DataMapper = require('./models/dataMapper');
var MongooseEntity = require('./models/mongooseEntity');

class Book extends MongooseEntity {
    constructor(){
        super();
        this.id = 123;
        this.createdOn = new Date();
        this.modifiedOn = new Date();
    }
}

class User extends Book{
    constructor(){
        super();
    }
}

class MyContext extends DataContext {
    constructor(){
        super();
    }
    init(){
        var entitySchema = {
            id: { type: String, required: true, unique: true },
            createdOn: { type: Date, required: true },
            modifiedOn: { type: Date, required: true }
        };
        
        var UserSchema = new mongoose.Schema(Object.assign({
            name: { type: String, required: true },
            email: { type: String, required: true, unique: true },
            passwordHash: { type: String, required: true },
        }, entitySchema));
        return [new DataMapper(UserSchema, User)];
    }
}

var context = new MyContext();
var inst = new User();