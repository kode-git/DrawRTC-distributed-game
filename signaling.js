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

    socket.on("createOrJoin", function(room, username){
        // getting users in the rooms
        var users = io.sockets.adapter.rooms.get(room) 
        var numClients;
        if(!users){
            numClients = 0;
        } else {
            numClients = users.size
        }
        console.log('Number of users in ' + room + ", is:" + numClients)
        if(!numClients){
            // room is void, the client is making a new one
            // join the room
            socket.join(room)
            // make the client as the initiator
            socket.emit("init", room, socket.id)
        } else {
            // there is some people in the room, client needs to join
        }
    })
})
