"use strict";

module.exports = {
    errors: {
        default: 'an error was occurred',
        initDoesNotExist: 'unable to call init method in DataContext',
        schemaIsNotAnMongoose: 'provided schema is not an mongoose schema',
        modelDoesNotExists: 'model is not provided',
        entityNameIsIncorrect: 'provided entity name is incorrect',
        incorrectInitReturnType: 'DataContext.init should return array of DataModels'
    }
}