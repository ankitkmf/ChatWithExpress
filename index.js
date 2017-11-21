var express = require("express");
var exphbs = require("express-handlebars");
var path = require("path");
//var app = require('express')();
//var server = require('http').createServer(app);
//var io = require('socket.io')(server);
//var io = require('socket.io');
var app = express();

app.use(express.static(path.join(__dirname, 'public')));

var hbs = exphbs.create({
    defaultLayout: 'default',
    partialsDir: ['views/partials/']
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

var users = [],
    connection = [];

const server = app.listen(3000, () => {
    console.log('server listening on port %d in %s mode', server.address().port, app.settings.env);
});

const io = require('socket.io')(server);

app.get('/', function(req, res) {
    res.render('home', {
        layout: 'default',
        title: 'Home Page'
    });
});

app.get('/chat', function(req, res) {
    res.render('chat', {
        layout: 'default',
        title: 'Chat Page'
    });
});

io.sockets.on("connection", function(socket) {
    connection.push(socket);
    console.log("connected: %s socket", connection.length);

    socket.on("disconnect", function(data) {
        // if (!socket.username) return;
        users.splice(users.indexOf(socket.username), 1);
        updateUsername();
        connection.splice(connection.indexOf(socket), 1);
        console.log("Disconnected: %s socket", connection.length);
    });

    socket.on("send message", function(data) {
        //   var IsCurrentUser = data.currentUser == socket.username ? true : false;
        io.sockets.emit("new message", { msg: data.text, user: socket.username });
    });

    socket.on("new user", function(data, callback) {
        var user = {
            isvalid: true,
            username: data
        };
        callback(user);
        socket.username = data;
        users.push(socket.username);
        updateUsername();
        //io.sockets.emit("new message", { msg: data });
    });

    function updateUsername() {
        io.sockets.emit("get users", users)
    }
});


// var port = 3000;
// app.listen(port, function() {
//     console.log("Server started at port " + port);
// });