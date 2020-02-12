const errors = require('restify-errors');
const Todo = require('../models/todo');
const fs = require('fs');
const config = require('../config')

function contentValidator(req){
    return new Promise((resolve, reject) => {
        if (!req.is('application/json')) {
            reject();
            return next(
                new errors.InvalidContentError("Expects 'application/json'"),
            );
        }else{
            resolve('Validation successful!');
        }
    })
}

function displayAllData(req, res, next){
    return new Promise((resolve, reject) => {
        Todo.apiQuery(req.params, function(err, docs) {
            if (err) {
                console.error(err);
                return next(
                    new errors.InvalidContentError(err.errors.name.message),
                );
                reject();
            }
            res.send(docs);
            resolve();
            next();
        });
    });
}

function addData(req, res, next, callback){
    let data = req.body || {};
    let todo = new Todo(data);
    todo.save(function(err) {
        if (err) {
            return next(new errors.InternalError(err.message));
            callback(err).then(log('Logged')).catch((err) => { log(err); });
            next();
        }
        res.send(201);
        callback(`Data added: ${data.task}\n`);
        next();
    });
}

function logToFile(data){
    return new Promise((resolve, reject) => {
        fs.appendFile(config.log_file, data, function(err){
            if(err){
                reject();
            }else{
                log('Logged');
                resolve();
            }
        });
    });
}

function updateData(req, res, next){
    return new Promise((resolve, reject) => {
        let data = req.body || {};
        if (!data._id) {
            data = Object.assign({}, data, { _id: req.params.todo_id });
        }
        Todo.findOne({ _id: req.params.todo_id }, function(err, doc) {
            if (err) {
                console.error(err);
                reject();
                return next(
                    new errors.InvalidContentError(err.errors.name.message),
                );
            } else if (!doc) {
                reject();
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
                var result = {
                    id: doc._id,
                    old_task: doc.task,
                    old_status: doc.status,
                    new_task: data.task,
                    new_status: data.status
                }
                resolve(result);
                res.send(200, data);
                next();
            });
        });
    })
}

function log(msg){
    console.log(msg);
}

module.exports = function(server) {
    server.post('/todos', async (req, res, next) => {
        await contentValidator(req).then(addData(req, res, next, logToFile)).catch((err) => { log(err); });
    });

    server.get('/todos', (req, res, next) => {
        var promise1 = displayAllData(req, res, next);
        var promise2 = logToFile('display all\n');
        Promise.all([promise1, promise2]).then(log('done')).catch((err) => { log(err); });
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

    server.put('/todos/:todo_id', async (req, res, next) => {
        // await contentValidator(req);
        // await updateData(req, res, next)
        //     .then((result) => {
        //         logToFile(`Updated data of item: ${result.id} from(task: ${result.old_task}, status: ${result.old_status}) to (task: ${result.new_task}, status: ${result.new_status})\n`);
        //     })
        //     .catch((err) => {log(err)});
        contentValidator(req).then(() => {
            updateData(req, res, next).then((result) => {
                logToFile(`Updated data of item: ${result.id} from(task: ${result.old_task}, status: ${result.old_status}) to (task: ${result.new_task}, status: ${result.new_status})\n`);
            });
        });
    });
};