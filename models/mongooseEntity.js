"use strict";

var mongoose = require('mongoose');
var _ids = new WeakMap();

module.exports = class {
    constructor(spec) {
        _ids.set(this, spec && spec._id ? spec._id: new mongoose.Types.ObjectId());
    }
    
    get _id() {
        return _ids.get(this);
    }
}