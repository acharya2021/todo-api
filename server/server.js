// LIBRARY IMPORTS
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');

// LOCAL IMPORTS
require('./config/config');
var {mongoose} = require('./db/mongoose');
// load in Todo and User
// create a variable using destructuring
var {Todo} = require('./models/todo');
var {User} = require('./models/user');
var {authenticate} = require('./middleware/authenticate');

// create a variable called app to store our express application
var app = express();
// create a port for deployment to heroku
const port = process.env.PORT;

// configure the middleware
app.use(bodyParser.json());

// configure your routes
// create a POST /todos route to let us create Todos

app.post('/todos', authenticate, async (req, res) => {
    // the body gets stored by bodyParser
    // console.log(req.body);

    // create a todo using information that comes from the user
    // that means create an instance of the mongoose model
    var todo = new Todo({
        text: req.body.text,
        _creator: req.user._id
    });

    try {
        const doc = await todo.save();
        res.send(doc);
    } catch (e) {
        res.status(400).send(e);
    }

    // // save it and handle the success case and the failure case
    // todo.save().then((doc) => {
    //     res.send(doc);
    // }, (e) => {
    //     res.status(400).send(e);
    // });

});

// POST /users
// the first argument is the url, the second is the callback function
app.post('/users', async (req, res) => {

    // use the pick method.
    // The first argument is the object you want to pick from
    // The second one is the attributes you want to pick
    const body = _.pick(req.body, ['email', 'password']);

    // create a new instance of User
    const user = new User(body);

    try {
        await user.save();
        const token = await user.generateAuthToken();
        res.header('x-auth', token).send(user);
    } catch (e) {
        res.status(400).send(e);
    }


    // // save this document to the database
    // user.save().then(() => {
    //     return user.generateAuthToken();
    // }).then((token) => {
    //     res.header('x-auth', token).send(user);
    // }).catch((e) => {
    //     res.status(400).send(e);
    // });

});

// create a private route
app.get('/users/me', authenticate, (req, res) => {
    res.send(req.user);
});

// Route for logging in users
// POST /users/login {email, password}
app.post('/users/login', async (req, res) => {

    try {
        const body = _.pick(req.body, ['email', 'password']);
        const user = await User.findByCredentials(body.email, body.password);
        const token = await user.generateAuthToken();
        res.header('x-auth', token).send(user);
    } catch (e) {
        res.status(400).send();
    }

    // User.findByCredentials(body.email, body.password).then((user) => {
    //     return user.generateAuthToken().then((token) => {
    //         res.header('x-auth', token).send(user);
    //     });
    // }).catch((e) => {
    //     res.status(400).send();
    // });
});

// register the GET handler using app.get
app.get('/todos', authenticate, async (req, res) => {

    try {
        const todos = await Todo.find({
            _creator: req.user._id
        });
        res.send({todos});

    } catch (e) {
        res.status(400).send(e);
    }


    // Todo.find({
    //     _creator: req.user._id
    // }).then((todos) => {
    //     res.send({todos});
    // }, (e) => {
    //     res.status(400).send(e);
    // });

});

// GET /todos/12345
app.get('/todos/:id', authenticate, async (req, res) => {
    var id = req.params.id;

    // validate id using isValid
    if (!ObjectID.isValid(id)) {
        // console.log("ID not valid");
        //returns 404 not found error on Postman
        return res.status(404).send();
    }

    try {
        const todo = await Todo.findOne({
            _id: id,
            _creator: req.user._id
        });
        if (!todo) {
            // return console.log("No todo found");
            return res.status(404).send();
        }
        // console.log("Todo by ID:", todo);
        res.send({todo});
    } catch (e) {
        res.status(400).send();
    }

    // Todo.findOne({
    //     _id: id,
    //     _creator: req.user._id
    // }).then((todo) => {
    //     // even if the query is successful, it might not result
    //     // in the actual document being returned. So check if it exists
    //     if (!todo) {
    //         // return console.log("No todo found");
    //         return res.status(404).send();
    //     }
    //     // console.log("Todo by ID:", todo);
    //     res.send({todo});
    //
    // }, (e) => {
    //     // console.log("An error occurred!");
    //     res.status(400).send();
    // });

});

// Delete a todo item by ID
app.delete('/todos/:id', authenticate, async (req, res) => {
    // get the id off the request object
    var id = req.params.id;
    // validate the id
    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }

    try {
        const todo = await Todo.findOneAndRemove({
            _id: id,
            _creator: req.user._id
        });
        if (!todo) {
            return res.status(404).send();
        }
        res.send({todo});
    } catch (e) {
        res.status(400).send();
    }

//     //now remove Todo by id
//     Todo.findOneAndRemove({
//         _id: id,
//         _creator: req.user._id
//     }).then((todo) => {
//         if (!todo) {
//             return res.status(404).send();
//         }
//         res.send({todo});
//     }, (e) => {
//         res.status(400).send();
//     });
});

// Update todo items using the patch route
app.patch('/todos/:id', authenticate, async (req, res) => {
    var id = req.params.id;
    var body = _.pick(req.body, ['text', 'completed']);

    if (!ObjectID.isValid(id)) {
        return res.status(404).send();
    }

    if (_.isBoolean(body.completed) && body.completed) {
        body.completedAt = new Date().getTime();
    } else {
        body.completed = false;
        body.completedAt = null;
    }

    try {
        const todo = await Todo.findOneAndUpdate({_id: id, _creator: req.user._id}, {$set: body}, {new: true});
        if (!todo) {
            return res.status(404).send();
        }
        res.send({todo});
    } catch (e) {
        res.status(400).send();
    }

    // Todo.findOneAndUpdate({_id: id, _creator: req.user._id}, {$set: body}, {new: true}).then((todo) => {
    //     if (!todo) {
    //         return res.status(404).send();
    //     }
    //
    //     res.send({todo});
    // }).catch((e) => {
    //     res.status(400).send();
    // })
});


app.delete('/users/me/token', authenticate, async (req, res) => {
    try {
        await req.user.removeToken(req.token);
        res.status(200).send();
    } catch (e) {
        res.status(400).send();
    }

    // req.user.removeToken(req.token).then(() => {
    //     res.status(200).send();
    // }, () => {
    //     res.status(400).send();
    // });
});


// this is a very basic server
app.listen(port, () => {
    console.log(`Started on port ${port}`);
});

// export the app
module.exports = {app};