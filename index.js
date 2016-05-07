"use strict";
var mongoose = require('mongoose');
var co  = require('co');
var DataContext = require('./models/dataContext');
var DataMapper = require('./models/dataMapper');
var MongooseEntity = require('./models/mongooseEntity');

var name = new WeakMap();
var title = new WeakMap();
var author = new WeakMap();
var books = new WeakMap();

mongoose.connect(`mongodb://${process.env.IP || '127.0.0.1'}/library`);

class User extends MongooseEntity {
    constructor(spec){
        super(spec);
        this.name = spec.name;
        this.books = spec.books || [];
    }
    get name(){
        return name.get(this);
    }
    set name(value){
        if(!value){
            throw 'no name';
        }
        name.set(this, value);
    }
    get books(){
        return books.get(this);
    }
    set books(value){
        if(!value || value.length === undefined){
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

class Book extends MongooseEntity {
    constructor(spec){
        super(spec);
        this.title = spec.title;
        this.author = spec.author || null;
    }
    get title(){
        return title.get(this);
    }
    set title(value){
        if(!value){
            throw 'no title';
        }
        title.set(this, value);
    }
    get author(){
        return author.get(this);
    }
    set author(value){
        if(!(value instanceof User) && !(value instanceof mongoose.Types.ObjectId)){
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
        var userSchema = new mongoose.Schema({
            name: { type: String, required: true, unique: true },
            books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book'}]
        });
        
        var bookSchema = new mongoose.Schema({
            title: { type: String, required: true },
            author: { type: mongoose.Schema.Types.ObjectId, ref: 'User'}
        });
        return [new DataMapper(userSchema, User), new DataMapper(bookSchema, Book)];
    }
}

var context = new MyContext();
/*var user = new User({ name: 'name'});
var book = new Book({ title: 'title'});
var book2 = new Book({ title: 'title2'});
user.books = [book];
user.books.push(book2);
book.author = user;*/

co(function*(){
    var user = yield* context.users.findOne({name: 'name'});
    yield* context.users.populate(user, {
        path: 'books',
        populate: {
            path: 'author',
            populate: 'books'
        }
    });
    yield* context.users.save(user);
    yield* context.books.save(book);
    return null;
});