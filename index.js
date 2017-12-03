var express = require("express");
var exphbs = require("express-handlebars");
var path = require("path");
var bodyparser = require("body-parser");
var db = require('./models/db');
var MongoDB = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectID;
var uniqid = require('uniqid');
var lodash = require('lodash');
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

var activeUsers = [],
    connection = [];

const httpsOptions = {
    key: fs.readFileSync('./ssl/privatekey.pem'),
    cert: fs.readFileSync('./ssl/certificate.pem')
}

var server = https.createServer(httpsOptions, app).listen(3000, function() {
    console.log("Express server listening on port " + 3000);
});

const io = require('socket.io')(server);

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
            $or: [{ "senderID": req.body.user.currentUser, "receiverID": req.body.user.refUser },
                { "senderID": req.body.user.refUser, "receiverID": req.body.user.currentUser }
            ]
        };
        var dataFilter = {};
        db.findAllChat("chats", whereFilter, dataFilter).then(function(info) {
            res.json(info);
        }).catch(function(error) {
            //  console.log("error response:" + JSON.stringify(error));
            res.json(false);
        });
    } else
        res.json(false);
});


io.sockets.on("connection", function(socket) {

    connection.push(socket);
    console.log("connected: %s socket", connection.length);
    socket.on("disconnect", function(data) {
        var user = {
            username: socket.username,
            userID: socket.userID,
            status: "offline"
        };
        // activeUsers = activeUsers.map((current) => {
        //     return {
        //         username: current.username,
        //         userID: current.userID,
        //         status: current.userID === user.userID ? user.status : current.status
        //     }
        // });
        activeUsers = activeUsers.filter(function(user) {
            return user.username != socket.username;
        });
        //  console.log("disconnect activeUsers:" + JSON.stringify(activeUsers));
        updateUsername(user);
        connection.splice(connection.indexOf(socket), 1);
        console.log("Disconnected: %s socket", connection.length);
    });

    socket.on("send message", function(data) {
        var filter = {
            "sender": data.currentUser,
            "senderID": data.currentUserID,
            "receiver": data.refUser,
            "receiverID": data.refUserID,
            "message": data.text,
            "isRead": false,
            "date": new Date().toISOString(),
        };

        //  console.log("Send message:" + JSON.stringify(filter));
        db.InsertChat("chats", filter).then(function(info) {
            // res.json(true);
        }).catch(function(error) {
            //  res.json(false);
        });

        io.sockets.emit("new message", {
            _id: data.currentUserID,
            message: data.text,
            sender: socket.username,
            receiverID: data.refUserID,
            receiver: data.refUser
        });
    });

    socket.on("new user", function(data, callback) {
        var filter = { "name": data };
        var userID = "";
        db.findOne('users', filter).then(function(results) {
            if (results != undefined && results._id != undefined) {
                userID = results._id;
                var user = {
                    //  isvalid: true,
                    username: data,
                    userID: userID,
                    status: "online"
                };
                callback(user);
                socket.username = data;
                socket.userID = userID;
                // users.push(socket.username);
                activeUsers.push(user);
                // console.log("find user");
                updateUsername(user);
            } else {
                var filter = {
                    "_id": uniqid(),
                    "name": data,
                    "image": "",
                    "dateTime": new Date().toDateString()
                };
                db.InsertUser("users", filter).then(function(info) {
                    //  console.log("info:" + JSON.stringify(info));
                    userID = info.resultID;
                    var user = {
                        //  isvalid: true,
                        username: data,
                        userID: userID,
                        status: "online"
                    };
                    callback(user);
                    socket.username = data;
                    socket.userID = userID;
                    //users.push(socket.username);
                    activeUsers.push(user);
                    // console.log("insert user");
                    updateUsername(user);
                })
            }
        }).catch(function(err) {
            //
        });
    });

    function updateUsername(user) {
        db.getAllUserUnreadMsgCount('users').then(function(results) {
            var users = [];
            if (results != null) {
                results.map((current) => {
                    var count = 0;
                    var status = "offline";
                    if (current.childs != null && current.childs.length > 0) {
                        count = current.childs.reduce(function(prevVal, elem) {
                            if (elem.receiverID == user.userID)
                                prevVal++;
                            else
                                prevVal = 0;
                            return prevVal;
                        }, 0);
                    }
                    status = lodash.filter(activeUsers, x => x.userID == current._id);
                    return users.push({
                        username: current.name,
                        userID: current._id,
                        unreadMsgCount: count,
                        status: (status != null && status.length > 0) ? "online" : "offline"
                    });
                });
                // console.log("updateUsername:" + JSON.stringify(users));
                io.sockets.emit("get users", users);
            }
        });
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