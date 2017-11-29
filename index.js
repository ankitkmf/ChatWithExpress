var express = require("express");
var exphbs = require("express-handlebars");
var path = require("path");
var bodyparser = require("body-parser");
var db = require('./models/db');
var MongoDB = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectID;
var app = express();
const http = require('http'),
    https = require('https'),
    fs = require('fs');

app.use(bodyparser.urlencoded({ extended: true }));
app.use(bodyparser.json());
app.use(express.static(path.join(__dirname, 'public')));

var hbs = exphbs.create({
    defaultLayout: 'default',
    partialsDir: ['views/partials/']
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));

var users = [],
    connection = [];

const httpsOptions = {
    key: fs.readFileSync('./ssl/privatekey.pem'),
    cert: fs.readFileSync('./ssl/certificate.pem')
}

var server = https.createServer(httpsOptions, app).listen(3000, function() {
    console.log("Express server listening on port " + 3000);
});


// const server = app.listen(3000, () => {
//     console.log('server listening on port %d in %s mode', server.address().port, app.settings.env);
// });
const io = require('socket.io')(server);

let authenticationMiddleware = function(req, res, next) {
    res.locals.errorMsg = req.flash('error')[0];
    res.locals.successMsg = req.flash('success')[0];
    if (req.session) {
        req.session.redirectUrl = req.originalUrl || req.url;
    }
    if (req.isAuthenticated()) {
        res.locals.user = req.session.user;
        return next();
    }
    req.session.userVisit = req.session.userVisit != null ? ++(req.session.userVisit) : 1;
    res.redirect('/');
};

app.get('/', function(req, res) {
    res.render('chat', {
        layout: 'default',
        title: 'Home Page'
    });
});

app.post("/data/getchat", function(req, res) {
    if (req.body.user != null) {
        // var whereFilter = { "userID": req.body.user.currentUser, "refUserID": req.body.user.refUser };
        var whereFilter = {
            $or: [{ "userID": req.body.user.currentUser, "refUserID": req.body.user.refUser },
                { "userID": req.body.user.refUser, "refUserID": req.body.user.currentUser }
            ]
        };
        var dataFilter = {};
        // console.log("getchat:" + JSON.stringify(whereFilter));

        db.findAllChat("chats", whereFilter, dataFilter).then(function(info) {
            // console.log("getchat json:" + JSON.stringify(info));
            res.json(info);
        }).catch(function(error) {
            console.log("error response:" + JSON.stringify(error));
            res.json(false);
        });
    } else
        res.json(false);
});


io.sockets.on("connection", function(socket) {

    connection.push(socket);
    console.log("connected: %s socket", connection.length);
    socket.on("disconnect", function(data) {
        users = users.filter(function(user) {
            return user.username != socket.username;
        });
        updateUsername();
        connection.splice(connection.indexOf(socket), 1);
        console.log("Disconnected: %s socket", connection.length);
    });

    socket.on("send message", function(data) {
        var filter = {
            "user": data.currentUser,
            "userID": data.currentUserID,
            "refUser": data.refUser,
            "refUserID": data.refUserID,
            "text": data.text,
            "date": new Date().toISOString(),
        };
        db.Insert("chats", filter).then(function(info) {
            // res.json(true);
        }).catch(function(error) {
            //  res.json(false);
        });

        io.sockets.emit("new message", { text: data.text, user: socket.username });
    });

    socket.on("new user", function(data, callback) {
        var filter = { "name": data };
        var userID = "";
        db.findOne('users', filter).then(function(results) {
            if (results != undefined && results._id != undefined) {
                userID = results._id;
                var user = {
                    isvalid: true,
                    username: data,
                    userID: userID
                };
                callback(user);
                socket.username = data;
                // users.push(socket.username);
                users.push(user);
                updateUsername();
            } else {
                var filter = { "name": data, "image": "", "dateTime": new Date().toDateString() };
                db.Insert("users", filter).then(function(info) {

                    userID = info.resultID;
                    var user = {
                        isvalid: true,
                        username: data,
                        userID: userID
                    };
                    callback(user);
                    socket.username = data;
                    //users.push(socket.username);
                    users.push(user);

                    updateUsername();
                })
            }
        }).catch(function(err) {
            // res.render('emailverified', { layout: 'layout', title: 'Email Verification Page', isError: "true" });
        });
    });

    function updateUsername() {
        io.sockets.emit("get users", users)
    }
});

db.connect(db.url, function(err) {
    if (err) {
        console.log('Unable to connect to Mongo.')
        process.exit(1)
    } else {
        console.log("Connected to database");
    }
});