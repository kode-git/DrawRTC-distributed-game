var express = require("express")
var http = require("http")

// Express app for signalling
var app = express();

// Using socket.io for signaling in WebRTC
var socketIO = require("socket.io")

// Public static in the main folder
app.use(express.static(__dirname));

// Rendering for the index page
app.get("/", function(request, response){
    response.render("./index.html");
})
var server = http.createServer(app) 

// Port of listening
server.listen(process.env.PORT || 3000, () =>{
    console.log(`signaling server is listening...`)
})

// Socket for signalling on the express server
var io = socketIO(server)

io.sockets.on("connection", function(socket){

    socket.on("create", function(room, username){
        // control of possible users in the room (if any the room already exists)
        var users = io.sockets.adapter.rooms.get(room) 
        var numClients;
        if(!users){
            numClients = 0;
        } else {
            numClients = users.size
        }
        if(!numClients){
            // room is void, the client is making a new one
            // join the room
            socket.join(room)
            // make the client as the initiator
            socket.emit("init", room, socket.id)
            numClients = io.sockets.adapter.rooms.get(room).size
            console.log('First user in ' + room +' is: ' + socket.id + " with username: " + username + ", total number of clients: " + numClients)
        } else {
            // there is already a room created with this id, we need to be sure that there is no clone
            socket.emit('alreadyExists', room, socket.id)
            console.log('Room ' + room + " already exists, error propagation to the client") 
        }
    })

    socket.on("join", function(room, username){
        // control if the room is not new
        var users = io.sockets.adapter.rooms.get(room)
        if(!users){
            // error, the client is trying to enter in a new room with no create mode
            socket.emit("joinError", room, socket.id)
        } else {
            // room with one or more clients connected, good one for joining 
            var numClients = users.size
            console.log('Current players in the room: ' + numClients)
            socket.join(room)
            console.log('Joining ' + username + ' in the room ' + room + ", total clients:" + io.sockets.adapter.rooms.get(room).size) 
            socket.emit('joined', room, socket.id)
        }
    })
})
