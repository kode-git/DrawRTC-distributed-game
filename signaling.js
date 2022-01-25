var express = require("express")
var http = require("http")

// Express app for signalling
var app = express();

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
server.listen(process.env.PORT || 3000, () => {
    console.log(`signaling server is listening...`)
})

// Socket for signalling on the express server
var io = socketIO(server)

io.sockets.on("connection", function (socket) {

    
    // Creating handler for the create a new room from the username
    socket.on("create", function (room, username) {
        // checking if the room is void
        var users = io.sockets.adapter.rooms.get(room)
        if(!users){
            // room is void, you can make a new one
            // adding the user and wait for connection
            socket.join(room)
            socket.emit('init', room, socket.id)
            console.log('Room ' +  room + " created by " + username + ", total users in the room: " + io.sockets.adapter.rooms.get(room).size)
        } else {
            // sending the error to the socket who made the request
            socket.emit('alreadyExists', room, socket.id)
        }
    })

    // Joining handler for the join in an existing room of the username
    socket.on("join", function (room, username) {
        // checking if the room exists
        var users = io.sockets.adapter.rooms.get(room)
        if(users){
            // room is valid
            var clients = new Array()
            for (var el of users.values()){
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

    // Close handler for the leaving of the username which owns the socket
    socket.on('close', function (room) {
        console.log("Client " + socket.id  + " is leaving")
        try{
            socket.leave(room)
            socket.to(room).emit('leave', room, socket.id)
        } catch(e){
            socket.to(room).emit('leave', room, socket.id)
        }
    })

})
