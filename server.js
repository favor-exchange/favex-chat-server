var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var mongo = require('mongodb')

var dburl = require('./mongoUrl.js').mongoLabUrl;

var port = 3000;

io.on('connection', function (socket) {

    console.log('a user connected');

    socket.on('new user', function (data) {
        console.log(data);

        if (data === undefined || data.facebookId === undefined) {
            console.log("missing parameter");
            return;
        }

        mongo.connect(dburl, function (err, db) {
            if (err) {
                console.log(err);
                return;
            }

            var messages = db.collection('messages');
            messages.find({ 'recipient': data.facebookId }).toArray(function (err, docs) {
                if (err) {
                    console.log(err);
                    db.close();
                    return;
                }
                console.log(docs);
                socket.emit('stored messages', docs);
                db.close();
            });
        });

        socket.join(data.facebookId);
        console.log("socket joined " + data.facebookId);
    });

    socket.on('new message', function (data) {

        var clients = io.sockets.adapter.rooms[data.recipient];
        
        if (clients == undefined) {
            console.log("no users in room")
            mongo.connect(dburl, function (err, db) {
                if (err) {
                    console.log(err);
                    return;
                }

                var messages = db.collection('messages');
                messages.insertOne(data, function (err, object) {
                    if (err) {
                        console.log(err);
                        db.close();
                        return;
                    }
                    db.close();
                });
            });
        }
        else {
            io.in(data.recipient).emit('new message', data);
            console.log("new message sent");
        }
    });

    socket.on('received', function (data) {
        console.log(data);
        if (data === undefined || data.facebookId === undefined) {
            console.log("missing parameter");
            return;
        }
        mongo.connect(dburl, function (err, db) {
            if (err) {
                console.log(err);
                return;
            }
            var messages = db.collection('messages');

            messages.remove(
                { 'recipient': data.facebookId },
                function (err) {
                    if (err) {
                        console.log(err);
                        db.close();
                        return;
                    }
                    console.log("messages deleted successfully");
                    db.close();
                }
            )
        });
    });

    socket.on('disconnect', function (data) {
        console.log('a user disconnected');
    });
});

server.listen(port);

console.log('Listening on local host port: ' + port);