const errors = require('restify-errors');
const Todo = require('../models/todo');

function promiseFunction(req, res, next){
    return new Promise((fulfill) => {
        Todo.apiQuery(req.params, function(err, docs) {
            if (err) {
                console.error(err);
                return next(
                    new errors.InvalidContentError(err.errors.name.message),
                );
            }
            res.send(docs);
            fulfill();
            next();
        });
    });
}

function callbackFunction(req, res, next, callback){
    Todo.apiQuery(req.params, function(err, docs) {
        if (err) {
            console.error(err);
            callback('error:', err);
            return next(
                new errors.InvalidContentError(err.errors.name.message),
            );
        }
        res.send(docs);
        next();
        callback('zala');
    });
}

function log(msg){
    console.log(msg);
}

module.exports = function(server) {
    server.post('/todos', (req, res, next) => {
        if (!req.is('application/json')) {
            return next(
                new errors.InvalidContentError("Expects 'application/json'"),
            );
        }
        let data = req.body || {};
        let todo = new Todo(data);
        todo.save(function(err) {
            if (err) {
                console.error(err);
                return next(new errors.InternalError(err.message));
                next();
            }
            res.send(201);
            next();
        });
    });

    // server.get('/todos', async (req, res, next) => {
    //     await promiseFunction(req, res, next).then(log('done'));
    // });

    server.get('/todos', (req, res, next) => {
        callbackFunction(req, res, next, log);
    });

    server.get('/todos/:todo_id', (req, res, next) => {
        Todo.findOne({ _id: req.params.todo_id }, function(err, doc) {
            if (err) {
                console.error(err);
                return next(
                    new errors.InvalidContentError(err.errors.name.message),
                );
            }
            res.send(doc);
            next();
        });
    });

    server.put('/todos/:todo_id', (req, res, next) => {
        if (!req.is('application/json')) {
            return next(
                new errors.InvalidContentError("Expects 'application/json'"),
            );
        }
        let data = req.body || {};
        if (!data._id) {
            data = Object.assign({}, data, { _id: req.params.todo_id });
        }
        Todo.findOne({ _id: req.params.todo_id }, function(err, doc) {
            if (err) {
                console.error(err);
                return next(
                    new errors.InvalidContentError(err.errors.name.message),
                );
            } else if (!doc) {
                return next(
                    new errors.ResourceNotFoundError(
                        'The resource you requested could not be found.',
                    ),
                );
            }
            Todo.update({ _id: data._id }, data, function(err) {
                if (err) {
                    console.error(err);
                    return next(
                        new errors.InvalidContentError(err.errors.name.message),
                    );
                }
                res.send(200, data);
                next();
            });
        });
    });
};