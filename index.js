"use strict";
var mongoose = require('mongoose');
var co  = require('co');
var DataContext = require('./models/dataContext');
var DataMapper = require('./models/dataMapper');
var MongooseEntity = require('./models/mongooseEntity');

var createdOn = new WeakMap();
var name = new WeakMap();
var title = new WeakMap();
var author = new WeakMap();
var books = new WeakMap();

mongoose.connect(`mongodb://${process.env.IP || '127.0.0.1'}/library`);

class Entity extends MongooseEntity {
    constructor(spec){
        super(spec);
        this.createdOn = spec.createdOn || new Date();
    }
    get createdOn(){
        return createdOn.get(this);
    }
    set createdOn(value){
        if(!(value instanceof Date)){
            throw 'createdOn is invalid';
        }
        createdOn.set(this, value);
    }
}

class User extends Entity {
    constructor(spec){
        super(spec);
        this.name = spec.name;
        this.books = spec.books;
    }
    get name(){
        return name.get(this);
    }
    set name(value){
        if(!value){
            throw 'name is invalid';
        }
        name.set(this, value);
    }
    get books(){
        return books.get(this);
    }
    set books(value){
        value = value || [];
        if(value.length === undefined){
            throw 'invalid books';
        }
        for(let book of value){
            if(!(book instanceof Book) && !(book instanceof mongoose.Types.ObjectId)){
                throw 'invalid books';
            }
        }
        books.set(this, value);
    }
}

class Book extends Entity {
    constructor(spec){
        super(spec);
        this.title = spec.title;
        this.author = spec.author;
    }
    get title(){
        return title.get(this);
    }
    set title(value){
        if(!value){
            throw 'title is invalid';
        }
        title.set(this, value);
    }
    get author(){
        return author.get(this);
    }
    set author(value){
        if(value !== null && value !== undefined && !(value instanceof User) && !(value instanceof mongoose.Types.ObjectId)){
            throw 'invalid author';
        }
        author.set(this, value);
    }
}

class MyContext extends DataContext {
    constructor(){
        super();
    }
    init(){
        var entitySchema = {
            createdOn: { type: Date, required: true }
        }
        
        var userSchema = new mongoose.Schema(Object.assign({
            name: { type: String, required: true, unique: true },
            books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book'}]
        }, entitySchema));
        
        var bookSchema = new mongoose.Schema(Object.assign({
            title: { type: String, required: true },
            author: { type: mongoose.Schema.Types.ObjectId, ref: 'User'}
        }, entitySchema));
        
        return [new DataMapper(userSchema, User), new DataMapper(bookSchema, Book)];
    }
}

var context = new MyContext();
var user = new User({ name: 'name'});
var book = new Book({ title: 'title'});
var book2 = new Book({ title: 'title2'});
user.books = [book];
user.books.push(book2);
book.author = user;
book2.author = user;

co(function*(){
    /*yield* context.users.save(user);
    yield* context.books.save(book);
    yield* context.books.save(book2);*/
    var user = yield* context.users.findOne({name: 'name'});
    yield* context.users.populate(user, {
        path: 'books',
        populate: {
            path: 'author',
            populate: 'books'
        }
    });
    yield* context.users.findOneAndPopulate({ name: 'name' }, {
        path: 'books'
    });
    //yield* context.users.save(user);
    
    return null;
}).catch(e => {
    console.error(e);
});