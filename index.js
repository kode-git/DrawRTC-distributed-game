var express = require("express")
var http = require("http")
var os = require('os')
// Express app for signalling
var app = express();


const netInterface = os.networkInterfaces();
var resultsNet = {}

// filtering nets on the interface of the host system
for (const name of Object.keys(netInterface)) {
    for (const net of netInterface[name]) {
        // If the IP is IPv4 type and it is not equal to localhost
        if (net.family === 'IPv4' && !net.internal) {
            if (!resultsNet[name]) {
                resultsNet[name] = [];
            }
            resultsNet[name].push(net.address);
        }
    }
}


  
// the current host IP is
console.log("Current Public IP host: " + resultsNet[Object.keys(resultsNet)[0]][0])
const host = resultsNet[Object.keys(resultsNet)[0]][0]
// Using socket.io for signaling in WebRTC
var socketIO = require("socket.io")

// Public static in the main folder
app.use(express.static(__dirname));

// Rendering for the index page
app.get("/", function (request, response) {
    response.render("./index.html");
})
var server = http.createServer(app)

// Port of listening
server.listen(process.env.PORT || 3000, host, () => {
    console.log(`signaling server is listening on ` + host + "...")
})

// Socket for signalling on the express server
var io = socketIO(server)

var rooms = new Array()
io.sockets.on("connection", function (socket) {


    // Creating handler for the create a new room from the username
    socket.on("create", function (room, username) {
        // checking if the room is void
        var users = io.sockets.adapter.rooms.get(room)
        if (!users) {
            // room is void, you can make a new one
            // adding the user and wait for connection
            socket.join(room)
            rooms.push(room)
            socket.emit('init', room, socket.id)
            console.log('Room ' + room + " created by " + username + ", total users in the room: " + io.sockets.adapter.rooms.get(room).size)
        } else {
            // sending the error to the socket who made the request
            socket.emit('alreadyExists', room, socket.id)
        }
    })

    // Joining handler for the join in an existing room of the username
    socket.on("join", function (room, username) {
        // checking if the room exists
        var users = io.sockets.adapter.rooms.get(room)
        if (users) {
            // room is valid
            var clients = new Array()
            for (var el of users.values()) {
                clients.push(el)
            }
            socket.join(room)
            console.log(username + " joined in the room" + room + ", total users: " + io.sockets.adapter.rooms.get(room).size)
            // Passing clients of the room to the new one for the answer management
            socket.emit('joined', room, clients, socket.id)
            // Passing the new one to the other clients
            socket.in(room).emit('new', room, socket.id)
        } else {
            // sending error to the client who try to join in a void room
            socket.emit('joinError', room)
        }
    })

    // Disconected handler for the no connection from one of the clients (no peer supported)
    socket.on('disconnecting', function () {
        console.log('Client ' + socket.id + " is disconnected")
        if (rooms.length != 0) {
            rooms.forEach(function (room) {
                var roomSize = io.sockets.adapter.rooms.get(room).size
                if(roomSize == 1) rooms = rooms.filter(function(value){ return value != room})
                socket.broadcast.to(room).emit('leave', room, socket.id)
            });
        }

    })
})
