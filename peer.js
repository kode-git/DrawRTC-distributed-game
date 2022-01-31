// using some of the most common STUN Servers to retrieve our public IP and port
const configuration = {
    'iceServers': [{
        url: 'stun:stun.l.google.com:19302'
    }, {
        url: 'stun:stun.anyfirewall.com:3478'
    }, {
        url: 'turn:turn.anyfirewall.com:443?transport=tcp',
        credential: 'webrtc',
        username: 'webrtc'
    }]
}


var roomId; // Mesh connections on P2P environment
var socket = io.connect() // socket opening
var _username; // Username of the player
var peerId; // your own id, the owned peer is not included in peers
var peer; // your peer informations
var isRemoved = false; // if the node is remove (client with no peer connection)
var usernames = new Map(); // hash for mapping peer id with their own usernames [peerId : username ]
var ids = new Array() // peer id in the mesh
var peers = new Map(); // hash for mapping peer id with peers [ peerId : connection ]
var isInitiator; // identify if the current client is the creator of the room
var vote; // Vote of the painter 
var gameMode = false; // Number of players in game mode
var counterGameMode = 0;
var painter; // the current painter of the game
var isVoted = false; // If the user is not voted
var numVotes = 0; // defined the number of votes on the peer
var voteList = new Map(); // list of votes [ username : candidateVote]
var isStarted = false; // if the game is started
var isJoined = false; // if the user is in the game mode
var scores = new Map(); // hash for mapping the game score with [ username : score_value]
createRoom = document.getElementById('create-button') // create button
createRoom.addEventListener("click", createGame); // create Lobby as the initializator
joinRoom = document.getElementById('join-button') // join button
joinRoom.addEventListener("click", joinGame) // join in an existing lobby


/* --------------- */
/*    Main calls   */
/* --------------- */

// Function to create a new game lobby 
function settingId() { return '_' + Math.random().toString(36).substr(2, 9); }

function createGame() {
    var username = document.getElementById("create-username").value
    if (username == "" || username == null) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'You need to insert username before create a new game!',
            confirmButtonColor: '#f0ad4e',
        })
        return 0; // Avoid connection making for no data issue
    }
    // Setting random Id for the room. People must use it to join with friends
    roomId = settingId()
    _username = username
    socket.emit('create', roomId, _username)
}

// function to join to an existing game lobby
function joinGame() {
    var username = document.getElementById("join-username").value
    roomId = document.getElementById("join-room").value
    if (username == "" || username == null || roomId == "" || roomId == null) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'You need to insert room and username before the submit',
            confirmButtonColor: '#f0ad4e',
        })
        return 0
    }
    _username = username
    if (!isInitiator) {
        console.log(_username + " request to join to room " + roomId)
        socket.emit("join", roomId, username)
    }
}


/* ----------------- */
/*  Socket Handlers  */
/* ----------------- */

// Init event handler for the setup of the initiator and notify the correct creation of the new room
socket.on('init', function (room, client) {
    console.log('Init on the client: ' + client)
    console.log('Room: ' + room + " is created by " + _username)
    isInitiator = true
    roomId = room
    peerId = client
    usernames.set(peerId, _username)
    scores.set(_username, 0)
    modifyContent(usernames)
    createPeerConnection(client)
    // going to the lobby and waiting for new users
    toggleLobby(room, _username)
    // peer are not able here because the creator is alone in the room
})

socket.on("joined", function (room, players, id) {
    console.log('Your id: ' + id)
    peerId = id;
    roomId = room;
    console.log('Current players:')
    for (let i = 0; i < players.length; i++) {
        console.log('User ' + i + ': ' + players[i])
    }
    roomId = room
    toggleLobby(room, _username)
    if (!isInitiator) {
        createPeerConnection(id)
    }
})

socket.on('new', function (room, client) {
    // making a new Peer Connection with the client
    if (peer == null) {
        // illegal peer
        console.log('Error: Illegal access in the room')
    } else {
        console.log('Client ' + client + " joined in the room " + room)
        ids.push(client) // pushing the client id
        roomId = room // setting room in case it isn't
        addPeerConnection(client);
    }
})

socket.on('leave', function (room, client) {
    console.log('Leave notified...')
    console.log('Client ' + client + " is leaving from room" + room)
    usernames.delete(client)
    scores.delete(client)
    peers.delete(client)
    ids = ids.filter(function (value, index, arr) {
        return value != client
    });
    modifyContent(usernames)
})


/* ----------------- */
/*  Peers Functions  */
/* ----------------- */

// Making your own peer (Receiver endpoint)
function createPeerConnection(id) {

    console.log('Creation of peer connection')
    if (peer != null && !isRemoved) {
        console.log('Peer already created')
        return 0
    }
    peer = new Peer(id, config = configuration)
    // Peer handlers 
    // Event handler to check id
    peer.on('open', function (id) {
        console.log('Open handler: your own id for peer is: ' + id)
        // Append your username 
        usernames.set(id, _username)
        scores.set(_username, 0)
    })

    peer.on("disconnected", function () {
        // void                                                                                                                  
    })

    peer.on('close', function () {
        peer.destroy()
    })

    peer.on("connection", function (connection) {
        connection.on('open', function () {
            console.log('Adding new connection with the peer: ' + peerId)
            connection.send({
                type: "sendUsername",
                username: _username,
                id: peerId,
            })
            peers.set(connection.peer, connection)
        })

        connection.on('close', function () {
            // The connection is closed on the sender endpoint, so we need to retrieve the peer end on
            // the connection itself.
            console.log('Closing connection with: ' + connection.peer)
            id = connection.peer
            if (isStarted) {
                // TO-DO: Updating content 
            }
            scores.delete(usernames.get(id))
            usernames.delete(id)
            peers.delete(id)
            ids = ids.filter(function (value, index, arr) {
                return value != id
            })
            modifyContent(usernames)
        })


        connection.on('data', function (data) {
            switch (data.type) {
                case "sendUsername":
                    sendUsernameReceiver(data)
                    break;
                case "joinGame":
                    joinGameReceiver(data)
                    break;
                case "availableGame":
                    // let every peer the possibility to start the game
                    toggleGameButton(false)
                    break;
                case "votePainter":
                    votePainter(data)
                    break;
                case "propagateScores":
                    propagateScores(data)
                    break;
                case "sendChatMessage":
                    sendChatMessage(data)
                    break;
                default:
                    console.log('Message not supported');
                    break;
            }
        })
        // peers.set(id, connection)
    })

    console.log('Current own peer: ')
    console.log(peer)
}

// Adding of a new connection for your peer (Sender endpoint)
function addPeerConnection(id) {
    var connection = peer.connect(id)

    connection.on('open', function () {
        connection.send({
            type: "sendUsername",
            username: _username,
            id: peerId,
        })
    })

    connection.on('data', function (data) {
        switch (data.type) {
            case "sendUsername":
                sendUsernameSender(data)
                break;
            case "joinGame":
                joinGameSender(data)
                break;
            case "availableGame":
                // let every peer the possibility to start the game
                toggleGameButton(false)
                break;
            case "votePainter":
                votePainter(data)
                break;
            case "propagateScores":
                propagateScores(data)
                break;
            case "sendChatMessage":
                sendChatMessage(data)
                break;
            default:
                console.log('Message not supported');
                break;
        }
    })

    connection.on('close', function () {
        console.log('Connection closed with: ' + id)
        scores.delete(usernames.get(id))
        if (isStarted) {
            // TO-DO: Updating content 
        }
        usernames.delete(id)
        peers.delete(id)
        ids = ids.filter(function (value, index, arr) {
            return value != id
        })
        modifyContent(usernames)
    })

    connection.on('disconnected', function () {
        console.log('Disconnection with: ' + id)
    })

    peers.set(connection.peer, connection)
    console.log("Peer added, current size:" + peers.size)

}
/* -------------------------------------- */
/*   Functions for Messages Management    */
/* -------------------------------------- */

// sendUsername handler for Sender Peer
function sendUsernameSender(data) {
    console.log('------------- Send Username Sender -------------')
    if (data.username == undefined || data.username == "" || data.id == undefined || data.id == "") {
        console.log('Invalid message format')
    } else {
        if (usernames.get(data.username) != undefined || usernames.get(data.username) != null || data.username == _username) {
            connection.send({
                type: "alreadyExists",
                username: data.username,
                id: peerId,
            })
        } else {
            console.log('Received: ' + data.username)
            usernames.set(data.id, data.username)
            // maybe if it is double
            scores.set(data.username, 0)
            modifyContent(usernames)
        }
    }
    console.log('------------------------------------------------')
}

// sendUsername handler for Receiver Peer
function sendUsernameReceiver(data) {
    console.log('------------- Send Username Receiver -------------')
    if (data.username == undefined || data.username == "" || data.id == undefined || data.id == "") {
        console.log('Invalid message format')
    } else if (isStarted) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'The game is started, you can\'t join in the room.',
            confirmButtonColor: '#f0ad4e',
        })
        removePeer()
        toggleHomepage()
    } else {
        console.log('New Peer connection')
        if (usernames.get(data.username) != undefined || usernames.get(data.username) != null || data.username == _username) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'The username ' + data.username + " already used, use another one to join in the room",
                confirmButtonColor: '#f0ad4e',
            })
            removePeer()
            toggleHomepage()
        } else {
            console.log('Received: ' + data.username)
            usernames.set(data.id, data.username)
            // maybe if it is double
            scores.set(data.username, 0)
            modifyContent(usernames)
        }
    }
    console.log('--------------------------------------------------')

}

// Join game handler for Receiver peer
function joinGameReceiver(data) {
    console.log('------------- Join Game on Receiver -------------')
    if (data.username == undefined) {
        console.log('Invalid message format')
    } else {
        if (isJoined) {
            notifyEnter(data.username)

        }
        counterGameMode++
        console.log('Current counter of game mode: ' + counterGameMode + ", on the joining of client: " + data.id)
        console.log('Current connected peers: ' + peers.size)
        if ((peers.size + 1) <= counterGameMode && !isStarted) {
            // peers are in the game mode
            console.log('Game mode: Available')
            sendBroadcast({
                type: 'availableGame',
                id: peerId,
            })
            toggleGameButton(false)

        } else {
            toggleGameButton(true)
        }
        console.log("Size of scores: " + scores.size)
        // Fixing missing propagation (Avoiding redundance message caching)
        if (scores.size != peers.size && !isStarted) {
            // resize it before the game start
            scoreSetting()
        }
        updateScore(scores)
    }
    console.log('--------------------------------------------------')
}

// Joining game handle for sender peer
function joinGameSender(data) {
    console.log('------------- Join Game on Sender -------------')
    if (data.username == undefined) {
        console.log('Invalid message format')
    } else {
        if (isJoined) {
            notifyEnter(data.username)

        }
        counterGameMode++
        console.log('Current counter of game mode: ' + counterGameMode + ", on the joining of client: " + data.id)
        console.log('Current connected peers: ' + peers.size)
        // +1 for the current peer consideration
        if ((peers.size + 1) <= counterGameMode && !isStarted) {
            // peers are in the game mode
            console.log('Game mode: Available')
            sendBroadcast({
                type: 'availableGame',
                id: peerId,
            })
            toggleGameButton(false)

        } else {
            toggleGameButton(true)
        }
        console.log("Size of scores: " + scores.size)
        // Fixing missing propagation (Avoiding redundance message caching)
        if (scores.size != peers.size && !isStarted) {
            // resize it before the game start
            scoreSetting()
        }
        updateScore(scores)
    }
    console.log('-----------------------------------------------')
}

// Propagation of the vote system on the Painter decision
function votePainter(data) {
    console.log('------------------- Vote Painter -------------------')
    if (data.id == null || data.candidate == null || data.candidate == undefined || data.id == undefined) {
        console.log('Illegal format error')
    } else {
        numVotes += 1
        console.log('Received: ' + data.candidate + " as a new vote")
        voteList.set(data.candidate, (voteList.get(data.candidate) + 1))
        console.log('Current number of votes: ' + numVotes)
        // this will be true for every peer except the last one
        checkVoteResults()
    }
    console.log('------------------------------------------------------')
}

// Propagation of scores on peers to modify the content (sender is generally the painter)
function propagateScores(data) {
    if (data.id == null || data.id == undefined) {
        console.log('Illegal format error')
    } else {
        // we have already the painter, so we don't need to take it from the message
        scores.delete(painter)
        updateScore(scores)
    }
}

// send the chat message to other peers
function propagateChatMessage(avatarNumber, message) {
    // TO-DO: Test the correct distributed order, may use the timestamp for ordering.
    sendBroadcast({
        type: "sendChatMessage",
        username: _username,
        content: message,
        avatar: avatarNumber,
        id: peerId,
    })
}


// Propagation of chat message on the receiver peer
function sendChatMessage(data) {
    if (data.username == undefined || data.content == undefined ||
        data.username == null  ||  data.id == undefined
        || data.avatar == undefined) {
        console.log('Illegal format error')
        console.log(data.username)
        console.log(data.content)
        console.log(data.avatar)
        console.log(data.id)
    } else {
        putPropagatedMessage(data.avatar, data.username, data.content)
    }
}

// Send a message in the meshs
function sendBroadcast(message) {
    console.log('------------- Send Broadcast Message -------------')
    if (message.type == "undefined") {
        console.log('Illegal format error')
    } else {
        console.log('Broadcast calling for message: ' + message.type)
        console.log('Number of peers to broadcast the message: ' + peers.size)
        console.log(peers)
        var connections = peers.values()
        for (let i = 0; i < peers.size; i++) {
            var connection = connections.next().value
            console.log('Connection sent:' + connection.toString())
            connection.send(message)
        }
    }
    console.log('-------------------------------------------------')
}


// Removing the Peer from the client
function removePeer() {
    isRemoved = true;
    peerId = null;
    isJoined = false
    isStarted = false
    isVoted = false
    counterGameMode = 0
    vote = null
    numVotes = 0
    voteList = new Map()
    usernames = new Map();
    ids = new Array();
    peers = new Map();
    isInitiator = null;
    if (peer != undefined) peer.destroy()
}

/* ---------------------------- */
/*   Game Management for Peer   */
/* ---------------------------- */


// This function remove the painter score from the table, that's because the painter is
// not part of the game but is the guess word creator (on drawing)
function removePainterScore() {
    console.log('-------- Remove Painter Score --------')
    console.log('Removing ' + painter + ' from score table')
    scores.delete(painter)
    updateScore(scores)
    console.log('--------------------------------------')
    sendBroadcast({
        type: "propagateScores",
        id: peerId,
    })
}


// This function set your own vote and propagate it to other peers
function initVote() {
    console.log('-------- Init Vote -----------')
    isVoted = true
    numVotes += 1
    vote = usernames.get(peers.keys().next().value) // first connection
    voteList.set(vote, (voteList.get(vote) + 1))
    console.log('Current candidates size: ' + voteList.size)
    console.log('You voted: ' + vote)
    console.log('-------------------------------')
    sendBroadcast({
        type: "votePainter",
        candidate: vote,
        id: peerId,
    })
    // this is true only in the last peer who define the last vote
    checkVoteResults()

}

function checkVoteResults() {
    if (numVotes >= peers.size + 1) {
        console.log('----------- Vote End -----------')
        var max = 0
        var iteratorVote = voteList.keys()
        var winner;
        for (let i = 0; i < voteList.size; i++) {
            var candidate = iteratorVote.next().value
            var candidateVote = voteList.get(candidate)
            console.log('Candidate ' + candidate + " has " + candidateVote + " votes")
            if (candidateVote > max) {
                max = candidateVote
                winner = candidate
            }
        }
        painter = winner
        // defines if this peer is the winner or a simple competitor 
        if (winner == _username) {
            // you are the winner
            console.log('You are the new painter')
            updatePainter()

        } else {
            console.log('Candidate painter is: ' + winner)
            updateCompetitor()
        }
        console.log('--------------------------------')
    }
}

// this function is the game init session on the current peer
function initGame() {
    console.log('------------- Init the game -------------')
    console.log(_username + " joining in the game")
    // changing dynamic content
    initGameContent(_username, roomId)
    // The player enter in the game mode
    gameMode = true
    // Adding in the game mode the player 
    counterGameMode++ // counting the player in the game mode
    // Pass to the game view
    toggleGame()
    // Player is joined in the game room
    isJoined = true
    // sending the joining status to all peers
    message = {
        type: "joinGame",
        username: _username,
        gameMode: true,
        id: peerId
    }
    console.log('---------------------------------------')
    sendBroadcast(message)

}

// Setting of the score table on the init of game mode
function scoreSetting() {
    console.log('------------- Score Settings -------------')
    if (!isStarted) {
        var usernamesIterator = usernames.values()
        voteList.set(_username, 0)
        for (let i = 0; i < peers.size; i++) {
            var player = usernamesIterator.next().value
            console.log('Init scores and votes for ' + player)
            scores.set(player, 0)
            voteList.set(player, 0)
        }
    } else {
        console.log('isStarted is true, so the game can not have new entries')
    }
    peerInfo()
    console.log('-----------------------------------------')
}

// Service function to display in the console the own information
function peerInfo() {
    console.log('------------- Peers info -------------')
    peersIds = peers.keys()
    console.log('Peers connected in the same mesh:')
    for (let i = 0; i < peers.size; i++) {
        var currentId = peersIds.next().value
        console.log("Peer id" + currentId + " => " + usernames.get(currentId))
        console.log('Score of ' + usernames.get(currentId) + " is " + scores.get(usernames.get(currentId)))
        if (voteList.get(usernames.get(currentId)) == undefined) {
            voteList.set(usernames.get(currentId), 0)
        }
        console.log('Votes of ' + usernames.get(currentId) + " are " + voteList.get(usernames.get(currentId)))
    }
    console.log('--------------------------------------')

}


/* ---------------------------- */
/*   Error Connection Handlers  */
/* ---------------------------- */

// Error handler for the alreadyExists game room during the create mode
socket.on("alreadyExists", function (room) {
    console.log("Game " + room + " already exists, need to retry create a new one")
    Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Room ' + room + ' already exists, retry to create a new one',
        confirmButtonColor: '#f0ad4e',
    })
})

// Error handler for the joining on a game room when it doesn't exist
socket.on("joinError", function (room) {
    console.log("Room " + room + ", do not exist, you must create it!")
    Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Game ' + room + ' doesn\'t exists, please copy the correct id or create a new game',
        confirmButtonColor: '#f0ad4e',
    })
})


/* ----------------- */
/*   Window Handlers */
/* ----------------- */

window.onbeforeunload = function (e) {
    peer.disconnect()
}