// using some of the most common STUN Servers to retrieve our public IP and port

const host = "172.20.10.3"
const port = 3000
const path = "/peerjs"

const configuration = {
    'iceServers': [
    { urls: "stun:stun.l.google.com:19302" }],
    sdpSemantics: "unified-plan",
    iceTransportPolicy: "all" // <- it means using only relay server (our free turn server in this case)
}

// Peer state object for the data management in the peer locally
var state = {
    roomId: null, // state.roomId which defines the peer mesh
    peerId: null, // peerID which defines the peer unique key
    username: null, // own username of the peer, it is set only when a client join in the lobby
    usernames: new Map(), // list of usernames related to the mesh 
    ids: new Array(), // ids of the list of peers in the mesh network
    peers: new Map(), // peers connections with the current one
    peerStatus: { // status which defines a collection of flag which defines a temporal peer status
        isJoined: false, // if the peer is joined in the game session 
        isWaitingJoin: false, // if the peer is waiting other peers in the game session
        isRemoved: false, // if in the mesh the peer is removed
        isStarted: false, // if the peer is in the interface of the game but the session game is not started
    },
    voteSystem: {
        vote: null, // the current peer vote
        isVoted: false, // peer didn't announce his vote
        voteList: new Map(), // defines the local list of votes
        numVotes: 0, // number of votes which the peer have in the local field
        isVotingSession: false, // if the voting session is started
        isWaitingVote: false, // if the peer is waiting other votes 
    },
    gameStatus: { // defines variables for the game session
        counterGameMode: 0,  // counter of the peers in the game mode
        isGameMode: false,
        guessWord: null, // defines the guess word (only the painter)
        painter: null, // defines the painter usernames (after the votes)
        scores: new Map(), // defines the hashmap of scores for the game session
    },
    prioritySystem: { // Priority system
        priority: null, // own priority of the peer
        priorities: new Map(), // priorities list of other peers in the mesh
    },
    isInitiator: false, // the peer is the creator of the mesh
    socket: io.connect(), // socket for signalling server
    chat : { // chat elements to synchronize in case of happens-before and respect the causal consistency
        messages: new Array(),
        avatars: new Array(),
        usernames: new Array(),
    },
    vectorClock: new Map(), // Vector Logic Clock implemented with Hashmap structure
    peer: null, // current peer object
}



// Function to reset the variables of the peer which identify a local state to compare with other peers
// and defines a global one. This function is called only when the peer is forced to disconnect or destroy itself
function resetVariablesState() {
    state.peerStatus.isRemoved = true;
    state.peerId = null;
    state.peerStatus.isJoined = false
    state.peerStatus.isStarted = false
    state.voteSystem.isVoted = false
    state.gameStatus.isGameMode = false
    state.gameStatus.counterGameMode = 0
    state.username = null
    state.roomId = null
    state.voteSystem.vote = null
    state.voteSystem.isWaitingVote = false
    state.peerStatus.isWaitingJoin = false
    state.voteSystem.numVotes = 0
    state.voteSystem.voteList = new Map()
    state.usernames = new Map();
    state.ids = new Array();
    state.peers = new Map();
    state.gameStatus.scores = new Map();
    state.gameStatus.guessWord = null
    state.isInitiator = false;
    vectorClock = new Map();
}

// Clean previous session in case of garbage
resetVariablesState()

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
    if(!state.socket.connected || state.socket.disconnected){
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Signalling server offline, you can\'t create any game',
            confirmButtonColor: '#f0ad4e',
        })
        return 0; // Avoid connection making for no data issue
    }
    var username = document.getElementById("create-username").value
    state.prioritySystem.priority = 0
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
    state.roomId = settingId()
    state.username = username
    state.socket.emit('create', state.roomId, state.username)
}

// function to join to an existing game lobby
function joinGame() {
    if(!state.socket.connected || state.socket.disconnected){
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Signalling server offline, you can\'t join to any game',
            confirmButtonColor: '#f0ad4e',
        })
        return 0; // Avoid connection making for no data issue
    }
    var username = document.getElementById("join-username").value
    state.roomId = document.getElementById("join-room").value
    if (username == "" || username == null || state.roomId == "" || state.roomId == null) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'You need to insert room and username before the submit',
            confirmButtonColor: '#f0ad4e',
        })
        return 0
    }
    state.username = username
    if (!state.isInitiator) {
        console.log(state.username + " request to join to room " + state.roomId)
        state.socket.emit("join", state.roomId, username)
    }
}


/* ----------------- */
/*  Socket Handlers  */
/* ----------------- */

function initSocketHandlers() {
    // Init event handler for the setup of the initiator and notify the correct creation of the new room

    /* ---------------------------- */
    /*     Connection Management    */
    /* ---------------------------- */

    state.socket.on('init', function (room, client) {
        console.log('Init on the client: ' + client)
        console.log('Room: ' + room + " is created by " + state.username)
        state.isInitiator = true
        state.roomId = room
        state.peerId = client
        state.usernames.set(state.peerId, state.username)
        state.gameStatus.scores.set(state.username, 0)
        modifyContentLobby(state.usernames)
        createPeerConnection(client)
        // going to the lobby and waiting for new users
        toggleLobby(room, state.username)
        // peer are not able here because the creator is alone in the room
    })

    state.socket.on("joined", function (room, players, id) {
        console.log('Your id: ' + id)
        state.peerId = id;
        state.roomId = room;
        console.log('Current players:')
        for (let i = 0; i < players.length; i++) {
            console.log('User ' + i + ': ' + players[i])
        }
        state.roomId = room
        console.log('You are: ' + state.username)
        toggleLobby(room, state.username)
        if (!state.isInitiator) {
            createPeerConnection(id)
        }
    })

    state.socket.on('new', function (room, client) {
        // making a new Peer Connection with the client
        if (state.peer == null) {
            // illegal peer
            console.log('Error: Illegal access in the room')
        } else {
            console.log('Client ' + client + " joined in the room " + room)
            state.roomId = room // setting room in case it isn't
            addPeerConnection(client);
        }
    })

    state.socket.on('leave', function (room, client) {
        manageLeave(room, client)
    })

    /* ---------------------------- */
    /*   Error Connection Handlers  */
    /* ---------------------------- */

    // Error handler for the alreadyExists game room during the create mode
    state.socket.on("alreadyExists", function (room) {
        console.log("Game " + room + " already exists, need to retry create a new one")
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Room ' + room + ' already exists, retry to create a new one',
            confirmButtonColor: '#f0ad4e',
        })
        cleanLocal()
        toggleHomepage()
        state.socket.disconnect()
        state.socket = io.connect()
        initSocketHandlers()
        disconnectPeer()
        removePeer()
    })

    // Error handler for the joining on a game room when it doesn't exist
    state.socket.on("joinError", function (room) {
        console.log("Room " + room + ", do not exist, you must create it!")
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Game ' + room + ' doesn\'t exists, please copy the correct id or create a new game',
            confirmButtonColor: '#f0ad4e',
        })
        cleanLocal()
        toggleHomepage()
        state.socket.disconnect()
        state.socket = io.connect()
        initSocketHandlers()
        disconnectPeer()
        removePeer()
    })

}

initSocketHandlers()

/* ----------------- */
/*  Peers Functions  */
/* ----------------- */

// Making your own peer (Receiver endpoint)
function createPeerConnection(id) {

    console.log('Creation of peer connection')
    if (state.peer != null && !state.peerStatus.isRemoved) {
        console.log('Peer already created')
        return 0
    }
    // state.peer = new Peer(id, config = configuration)
    state.peer = new Peer(id, {
        host: host,
        port: port,
        path: path,
        confi: configuration,
        debug: 3,
    })
    // Peer handlers 
    // Event handler to check id
    state.peer.on('open', function (id) {
        console.log('Open peer: your own id for peer is: ' + id)
        state.vectorClock.set(id, 0)
        // Append your username 
        state.prioritySystem.priority = state.peers.size + 1 + randomIntFromInterval(1, 2147483647)
        state.usernames.set(id, state.username)
        state.gameStatus.scores.set(state.username, 0)
    })

    state.peer.on("disconnected", function () {
        // void                                                                                                                  
    })

    state.peer.on('close', function () {
        if(state.peer != null)
        state.peer.destroy()
    })

    state.peer.on("connection", function (connection) {
        connection.on('open', function () {
            console.log('Adding new connection with the peer: ' + state.peerId)
            connection.send({
                type: "sendUsername",
                username: state.username,
                id: state.peerId,
                priorityPeer: state.prioritySystem.priority,
                mode: state.gameStatus.isGameMode,
            })
            state.peers.set(connection.peer, connection)
        })

        connection.on('close', function () {
            // The connection is closed on the sender endpoint, so we need to retrieve the peer end on
            // the connection itself.
            console.log('Closing connection with: ' + connection.peer + "on receiver endpoint")
            localState()
            id = connection.peer
            if (state.peerStatus.isStarted) {
                console.log('It is isStarted')
            }
            if(state.gameStatus.isGameMode){
                console.log('Game Mode management')
            }
            state.gameStatus.scores.delete(state.usernames.get(id))
            state.usernames.delete(id)
            state.peers.delete(id)
            state.ids = state.ids.filter(function (value, index, arr) {
                return value != id
            })
            modifyContentLobby(state.usernames)
        })


        connection.on('data', function (data) {
            console.log('Data type received: ' + data.type)
            updateVector(data)
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
                case "guessed":
                    guessed(data)
                    break;
                case "draw":
                    onDraw(data)
                    break;
                case "clean":
                    onClean(data)
                    break;
                case "endGame":
                    endGame(data)
                    break;
                case "ping":
                    receivePing(data)
                    break;
                default:
                    console.log('Message not supported');
                    break;
            }
        })
        // state.peers.set(id, connection)
    })

    console.log('Current own peer: ')
    console.log(state.peer)
}

// Adding of a new connection for your peer (Sender endpoint)
function addPeerConnection(id) {
    var connection = state.peer.connect(id)
    console.log('Connection: ',connection)
    connection.on('open', function () {
        console.log('Open connection...')
        connection.send({
            type: "sendUsername",
            username: state.username,
            id: state.peerId,
            priorityPeer: state.prioritySystem.priority,
            mode: state.gameStatus.isGameMode,
        })
    })

    connection.on('data', function (data) {
        console.log('Data type received: ' + data.type)
        console.log(state)
        updateVector(data)
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
            case "guessed":
                guessed(data)
                break;
            case "draw":
                onDraw(data)
                break;
            case "clean":
                onClean(data)
                break;
            case "endGame":
                endGame(data)
                break;
            case "ping":
                receivePing(data)
                break;
            default:
                console.log('Message not supported');
                break;
        }
    })

    connection.on('close', function () {
        console.log('Connection closed with: ' + id + " on sender endpoint")
        localState()
        state.gameStatus.scores.delete(state.usernames.get(id))
        if (state.peerStatus.isStarted) {
            console.log('It is isStarted')
        }
        if(state.gameStatus.isGameMode){
            console.log('Game Mode management')
        }
        state.usernames.delete(id)
        state.peers.delete(id)
        state.ids = state.ids.filter(function (value, index, arr) {
            return value != id
        })
        modifyContentLobby(state.usernames)
    })

    connection.on('disconnected', function () {
        console.log('Disconnection with: ' + id)
    })

    state.peers.set(connection.peer, connection)
    console.log("Peer added, current size:" + state.peers.size)


}
/* -------------------------------------- */
/*   Functions for Messages Management    */
/* -------------------------------------- */

// Updating vector clock for causal consistency
function updateVector(data){
    if(data.id == undefined || data.id == null){
        console.log('Error message')
    } else {
        var id = data.id
        if(state.vectorClock.get(id) == undefined || state.vectorClock.get(id) == null){
            state.vectorClock.set(data.id, 1)
        } else {
            state.vectorClock.set(data.id, max(state.vectorClock.get(data.id), data.vector) + 1)
            console.log(state.vectorClock)
        }
        state.vectorClock.set(state.peerId, state.vectorClock.get(state.peerId) + 1)
    }
}

// Checking max from two integer
function max(x, y){
    return x > y ? x : y
}

function happensBefore(id){
    if(state.vectorClock.get(id) >= state.vectorClock.get(state.peerId)){
        return true
    } else return false
}
// sendUsername handler for Sender Peer
function sendUsernameSender(data) {
    if (data.username == undefined || data.username == "" || data.id == undefined || data.id == "") {
        console.log('Invalid message format')
    } else {
        if (state.usernames.get(data.username) != undefined || state.usernames.get(data.username) != null || data.username == state.username) {
            connection.send({
                type: "alreadyExists",
                username: data.username,
                id: state.peerId,
            })
        } else {
            console.log('Received: ' + data.username)
            state.usernames.set(data.id, data.username)
            // maybe if it is double
            state.gameStatus.scores.set(data.username, 0)
            state.prioritySystem.priorities.set(data.id, data.priorityPeer)
            state.ids.push(data.id) // pushing the client id
            console.log('Priority of ' + data.id + " is: " + data.priorityPeer)
            if (data.mode) {

                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'The game is started, you can\'t join in the room.',
                    confirmButtonColor: '#f0ad4e',
                })
                toggleHomepage()
                state.socket.disconnect()
                state.socket = io.connect()
                initSocketHandlers()
                disconnectPeer()
                removePeer()
            }
            modifyContentLobby(state.usernames)
        }
    }
}

// sendUsername handler for Receiver Peer
function sendUsernameReceiver(data) {
    if (data.username == undefined || data.username == "" || data.id == undefined || data.id == "") {
        console.log('Invalid message format')
    } else if (state.peerStatus.isStarted) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'The game is started, you can\'t join in the room.',
            confirmButtonColor: '#f0ad4e',
        })
        toggleHomepage()
        state.socket.disconnect()
        state.socket = io.connect()
        initSocketHandlers()
        disconnectPeer()
        removePeer()
    } else {
        console.log('New Peer connection')
        if (state.usernames.get(data.username) != undefined || state.usernames.get(data.username) != null || data.username == state.username) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'The username ' + data.username + " already used, use another one to join in the room",
                confirmButtonColor: '#f0ad4e',
            })
            toggleHomepage()
            state.socket.disconnect()
            state.socket = io.connect()
            initSocketHandlers()
            disconnectPeer()
            removePeer()
        } else {
            console.log('Received: ' + data.username)
            state.usernames.set(data.id, data.username)
            // maybe if it is double
            state.gameStatus.scores.set(data.username, 0)
            state.prioritySystem.priorities.set(data.id, data.priorityPeer)
            state.ids.push(data.id) // pushing the client id
            console.log('Priority of ' + data.id + " is: " + data.priorityPeer)
            if (data.mode) {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'The game is started, you can\'t join in the room.',
                    confirmButtonColor: '#f0ad4e',
                })
                toggleHomepage()
                state.socket.disconnect()
                state.socket = io.connect()
                initSocketHandlers()
                disconnectPeer()
                removePeer()
            }
            modifyContentLobby(state.usernames)
        }
    }

}

// Join game handler for Receiver peer
function joinGameReceiver(data) {
    if (data.username == undefined) {
        console.log('Invalid message format')
    } else {
        if (state.peerStatus.isJoined) {
            notifyEnter(data.username)

        }
        state.gameStatus.counterGameMode++
        console.log('Current counter of game mode: ' + state.gameStatus.counterGameMode + ", on the joining of client: " + data.id)
        console.log('Current connected peers: ' + state.peers.size)
        if ((state.peers.size + 1) <= state.gameStatus.counterGameMode && !state.peerStatus.isStarted) {
            // peers are in the game mode
            console.log('Game mode: Available')
            sendBroadcast({
                type: 'availableGame',
                id: state.peerId,
                vector: state.vectorClock.get(state.peerId),
            })
            toggleGameButton(false)

        } else {
            toggleGameButton(true)
        }
        console.log("Size of state.gameStatus.scores: " + state.gameStatus.scores.size)
        // Fixing missing propagation (Avoiding redundance message caching)
        if (state.gameStatus.scores.size != state.peers.size && !state.peerStatus.isStarted) {
            // resize it before the game start
            scoreSetting()
        }
        updateScore(state.gameStatus.scores)
    }
}

// Joining game handle for sender peer
function joinGameSender(data) {
    if (data.username == undefined) {
        console.log('Invalid message format')
    } else {
        if (state.peerStatus.isJoined) {
            notifyEnter(data.username)

        }
        state.gameStatus.counterGameMode++
        console.log('Current counter of game mode: ' + state.gameStatus.counterGameMode + ", on the joining of client: " + data.id)
        console.log('Current connected state.peers: ' + state.peers.size)
        // +1 for the current peer consideration
        if ((state.peers.size + 1) <= state.gameStatus.counterGameMode && !state.peerStatus.isStarted) {
            // peers are in the game mode
            console.log('Game mode: Available')
            sendBroadcast({
                type: 'availableGame',
                id: state.peerId,
                vector: state.vectorClock.get(state.peerId),
            })
            toggleGameButton(false)

        } else {
            toggleGameButton(true)
        }
        console.log("Size of scores: " + state.gameStatus.scores.size)
        // Fixing missing propagation (Avoiding redundance message caching)
        if (state.gameStatus.scores.size != state.peers.size && !state.peerStatus.isStarted) {
            // resize it before the game start
            scoreSetting()
        }
        updateScore(state.gameStatus.scores)
    }
}

// Propagation of the vote system on the Painter decision
function votePainter(data) {
    if (data.id == null || data.candidate == null || data.candidate == undefined || data.id == undefined) {
        console.log('Illegal format error')
    } else {
        state.voteSystem.isVotingSession = true
        state.voteSystem.numVotes += 1
        console.log('Received: ' + data.candidate + " as a new vote")
        if (data.priority) {
            console.log('Vote is on priority (given by the initiator)')
        }
        state.voteSystem.voteList.set(data.candidate, (state.voteSystem.voteList.get(data.candidate) + data.weigth))
        console.log('Current number of votes: ' + state.voteSystem.numVotes)
        // this will be true for every peer except the last one
        checkVoteResults()
    }
}

// Propagation of scores on peers to modify the content (sender is generally the painter)
function propagateScores(data) {
    if (data.id == null || data.id == undefined) {
        console.log('Illegal format error')
    } else {
        // we have already the painter, so we don't need to take it from the message
        if (state.gameStatus.scores.get(state.gameStatus.painter) != undefined || state.gameStatus.scores.get(state.gameStatus.painter) != null) state.gameStatus.scores.delete(state.gameStatus.painter)
        updateScore(state.gameStatus.scores)
    }
}

// send the chat message to other peers
function propagateChatMessage(avatarNumber, message) {
    // Update the chat state locally
    state.chat.avatars.push(avatarNumber)
    state.chat.messages.push(message)
    state.chat.usernames.push(state.username)
    sendBroadcast({
        type: "sendChatMessage",
        username: state.username,
        content: message,
        avatar: avatarNumber,
        id: state.peerId,
        vector: state.vectorClock.get(state.peerId),
        avatars: state.chat.avatars,
        messages: state.chat.messages,
        usernames: state.chat.usernames,
    })
}


// Propagation of chat message on the receiver peer
function sendChatMessage(data) {
    if (data.username == undefined || data.content == undefined ||
        data.username == null || data.id == undefined
        || data.avatar == undefined) {
        console.log('Illegal format error')
    } else {
        if(happensBefore(data.id)){
            if (state.gameStatus.isGameMode) {
                state.chat.messages.push(data.content)
                state.chat.messages.push(data.avatar)
                state.chat.usernames.push(data.username)
                putPropagatedMessage(data.avatar, data.username, data.content)
            }
            if (state.gameStatus.painter != undefined && state.gameStatus.painter != null && state.gameStatus.painter == state.username) {
                // this is only for the painter view
                parseGuess(data.username, data.content, state.gameStatus.guessWord)
            }       
        } else {
            if (state.gameStatus.isGameMode) {
                // happensBefore violated, repropagation
                state.chat.messages = data.messages
                state.chat.avatars = data.avatars
                state.chat.usernames = data.usernames
                putPropagatedMessages(state.chat.avatars, state.chat.usernames, state.chat.messages, state.username)
            }
            if (state.gameStatus.painter != undefined && state.gameStatus.painter != null && state.gameStatus.painter == state.username) {

                // if the control of previously conflicted messages is negative (no one of the ordered list won)
                parseGuess(data.username, data.content, state.gameStatus.guessWord)
            }      
        }
    }
}

// Propagation of guessed event from painter to competitors
function guessed(data) {
    if (data.player == undefined || data.id == undefined || data.word == undefined) {
        console.log('Illegal format error')
    } else {
        console.log('------------ Guessed --------------')

        if (state.gameStatus.scores.get(data.player) == undefined) {
            console.log('Error, the user is not legal, the peer' + data.id + ' did a cheat message!')
        } else {
            // local setting
            state.gameStatus.scores.set(data.player, state.gameStatus.scores.get(data.player) + 1)
            updateScore(state.gameStatus.scores)
            if (state.gameStatus.scores.get(data.player) == 2) { // To-Do: It is set to 2 instead of 10 for development and testing
                if (data.player == state.username) {
                    Swal.fire({
                        icon: 'info',
                        title: 'You are the winner!!',
                        text: 'Congratulation, you won the word!',
                        confirmButtonColor: '#f0ad4e',
                    })
                } else {
                    Swal.fire({
                        icon: 'info',
                        title: data.player + ' won the game!',
                        text: 'You lost the game, make a new game and guess quicker!',
                        confirmButtonColor: '#f0ad4e',
                    })
                }
                cleanLocal()
                toggleHomepage()
                state.socket.disconnect()
                state.socket = io.connect()
                initSocketHandlers()
                disconnectPeer()
                removePeer()
                // removePeer() no need
            } else {
                if (data.player == state.username) {
                    // you guessed the word!
                    Swal.fire({
                        icon: 'info',
                        title: 'Guessed It!',
                        text: 'Congratulation, you guessed the word!',
                        confirmButtonColor: '#f0ad4e',
                    })

                } else {
                    // an other player guessed the word
                    Swal.fire({
                        icon: 'info',
                        title: data.player + ' guessed It!',
                        text: data.player + ' guessed the word! ',
                        confirmButtonColor: '#f0ad4e',
                    })
                }
            }
        }
        console.log('------------------------------------')
    }

}

// this function update the competitors peers on the end game event, so they handle it and manage the view and data
// to restore the initial situation and gives the possibility to restart a new game.
function endGame(data) {
    console.log('------------ End Game ------------')
    if (data.id != null || data.id != undefined) {
        cleanLocal()
        toggleHomepage()
        state.socket.disconnect()
        state.socket = io.connect()
        initSocketHandlers()
        disconnectPeer()
        removePeer()
    } else {
        console.log('Illegal format error')
    }
    console.log('----------------------------------')
}


// Send a message in the meshs
function sendBroadcast(message) {
    console.log('------------- Send Broadcast Message -------------')
    if (message.type == "undefined") {
        console.log('Illegal format error')
    } else {
        console.log('Broadcast calling for message: ' + message.type)
        console.log('Number of peers to broadcast the message: ' + state.peers.size)
        console.log(state.peers)
        state.vectorClock.set(state.peerId, state.vectorClock.get(state.peerId) + 1)
        message.vector = state.vectorClock.get(state.peerId)
        var connections = state.peers.values()
        for (let i = 0; i < state.peers.size; i++) {
            var connection = connections.next().value
            console.log('Connection sent:' + connection.toString())
            connection.send(message)
        }
    }
    console.log('-------------------------------------------------')
}


// Removing the Peer from the client (peer resetting)
function removePeer() {
    console.log('---------- Remove Peer --------------')
    resetVariablesState()
    cleanContent()
    if (state.peer != undefined) state.peer.destroy()
    console.log('-------------------------------------')
}

/* ---------------------------- */
/*   Game Management for Peer   */
/* ---------------------------- */


// parse guess is only in the painter, and check if an user guessed the word
async function parseGuess(username, message, guess) {
    if (message.includes(guess)) {
        // competitor written the guess word
        console.log("------------- Parse Guess -------------")
        console.log('Player ' + username + " guess the word")
        console.log('Word was: ' + guess)
        Swal.fire({
            icon: 'info',
            title: 'Guessed It!',
            text: username + ' guessed the word!',
            confirmButtonColor: '#f0ad4e',
        })
        // local setting
        state.gameStatus.scores.set(username, state.gameStatus.scores.get(username) + 1)
        updateScore(state.gameStatus.scores)
        // propagate new settings
        sendBroadcast({
            type: "guessed",
            word: guess,
            player: username,
            id: state.peerId,
            vector: state.vectorClock.get(state.peerId),
        })
        state.gameStatus.guessWord = guessWords[randomIntFromInterval(0, guessWords.length - 1)]
        updateGuessContent(state.gameStatus.guessWord)
        if (state.gameStatus.scores.get(username) >= 2) { // To-Do: It is 10 but for development and testing is set to 2
            console.log('The player ' + username + " won the game!")
            Swal.fire({
                icon: 'info',
                title: 'And the winner is... ' + username + "!",
                text: username + ' obtained 10 points, he won the game!',
                confirmButtonColor: '#f0ad4e',
            })
            // disconnectPeer()
            sendBroadcast({
                type: "endGame",
                id: state.peerId,
            })
            cleanLocal()
            toggleHomepage()
            state.socket.disconnect()
            state.socket = io.connect()
            initSocketHandlers()
            disconnectPeer()
            removePeer()
        }
        console.log("---------------------------------------")

    } else {
        // do nothing
    }
}


// Disconnect Peers for every connections he did
function disconnectPeer() {
    resetVariablesState()
    if(state.peer != null) state.peer.disconnect()
    cleanContent()

    // Manage connection
    var connections = state.peers.values()
    for (let i = 0; i < state.peers.size; i++) {
        var connection = connections.next().value
        connection.close()
    }
}

// This function remove the painter score from the table, that's because the painter is
// not part of the game but is the guess word creator (on drawing)
function removePainterScore() {
    console.log('-------- Remove Painter Score --------')
    console.log('Removing ' + state.gameStatus.painter + ' from score table')
    state.gameStatus.scores.delete(state.gameStatus.painter)
    updateScore(state.gameStatus.scores)
    console.log('--------------------------------------')
    sendBroadcast({
        type: "propagateScores",
        id: state.peerId,
        vector: state.vectorClock.get(state.peerId),
    })
}

// Reset the voting system for crash candidate
function resetVoteSystem(leaver) {
    console.log('--------- Reset Vote System ----------')
    isVoted = false
    state.voteSystem.isWaitingVote = false
    state.voteSystem.numVotes = 0
    state.voteSystem.vote = null
    state.voteSystem.voteList = new Map()
    console.log('Reset vote list...')
    console.log(state.usernames)
    console.log('Size of usernames: ' + state.usernames.size)
    state.voteSystem.voteList.set(state.username, 0)
    var listUsernames = state.usernames.values()
    for (let i = 0; i < state.usernames.size; i++) {
        state.voteSystem.voteList.set(listUsernames.next().value, 0)
    }
    console.log('Every candidate is reset')
    console.log('Current player who can vote: ' + (state.peers.size + 1)) // + 1 to consider myself
    console.log('Restart the initial state of Start Button...')
    if (leaver == state.gameStatus.painter) {
        // do nothing
    } else {
        state.gameStatus.scores.set(state.gameStatus.painter, 0)
        updateScore(state.gameStatus.scores)
    }
    resetStartButton();
    console.log('--------------------------------------')
}

// This function set your own vote and propagate it to other peers
function initVote() {
    console.log('-------- Init Vote -----------')
    state.voteSystem.isVoted = true
    state.voteSystem.isWaitingVote = true
    state.voteSystem.numVotes += 1
    state.voteSystem.vote = state.usernames.get(state.peers.keys().next().value) // first connection
    if (state.isInitiator) {
        var weigthInit = 2 + 2147483647
        state.voteSystem.voteList.set(state.voteSystem.vote, (state.voteSystem.voteList.get(state.voteSystem.vote) + weigthInit))
        console.log('Current candidates size: ' + state.voteSystem.voteList.size)
        console.log('You voted: ' + state.voteSystem.vote)
        console.log('-------------------------------')
        sendBroadcast({
            type: "votePainter",
            candidate: state.voteSystem.vote,
            priority: true,
            weigth: weigthInit,
            id: state.peerId,
            vector: state.vectorClock.get(state.peerId),
        })
    } else {
        state.voteSystem.voteList.set(state.voteSystem.vote, (state.voteSystem.voteList.get(state.voteSystem.vote) + state.prioritySystem.priority))

        console.log('Current candidates size: ' + state.voteSystem.voteList.size)
        console.log('You voted: ' + state.voteSystem.vote)
        console.log('-------------------------------')
        sendBroadcast({
            type: "votePainter",
            candidate: state.voteSystem.vote,
            priority: false,
            weigth: state.prioritySystem.priority,
            id: state.peerId,
            vector: state.vectorClock.get(state.peerId),
        })
    }

    // this is true only in the last peer who define the last vote
    checkVoteResults()

}

// Checking the vote result on the painter voting system
function checkVoteResults() {
    if (state.voteSystem.numVotes >= state.peers.size + 1) {
        console.log('----------- Vote End -----------')
        state.peerStatus.isStarted = true // starting of the game session
        state.voteSystem.isVoted = false // ending of the voting session
        state.voteSystem.isVotingSession = false // user will not receive vote anymore
        var max = 0
        var iteratorVote = state.voteSystem.voteList.keys()
        var winner;
        console.log('Weighted votes:')
        for (let i = 0; i < state.voteSystem.voteList.size; i++) {
            var candidate = iteratorVote.next().value
            var candidateVote = state.voteSystem.voteList.get(candidate)
            console.log('Candidate ' + candidate + ' has ' + candidateVote + ' votes')
            if (candidateVote > max) {
                max = candidateVote
                winner = candidate
            }
        }
        console.log('Painter is ' + winner + " with a weighed vote of " + max)
        state.gameStatus.painter = winner
        // Remove painter score from table
        removePainterScore()
        // defines if this peer is the winner or a simple competitor 
        if (winner == state.username) {
            // you are the winner
            console.log('You are the new painter')
            // setting the initial guess word
            state.gameStatus.guessWord = guessWords[randomIntFromInterval(0, guessWords.length - 1)]
            console.log('Guess word is: ' + state.gameStatus.guessWord)
            updatePainter()

        } else {
            console.log('Candidate painter is: ' + winner)
            updateCompetitor()
        }
        console.log('--------------------------------')

    }
}


// Setting guess word for external use
function setGuessWord(guess) {
    state.gameStatus.guessWord = guess
}

// Getting guess word for external use
function getGuessWord() {
    return state.gameStatus.guessWord
}
// this function is the game init session on the current peer
function initGame() {
    console.log('------------- Init the game -------------')
    console.log(state.username + " joining in the game")
    // changing dynamic content
    initGameContent(state.username, state.roomId)
    // The player enter in the game mode
    state.gameStatus.isGameMode = true
    // Adding in the game mode the player 
    state.gameStatus.counterGameMode++ // counting the player in the game mode
    // Pass to the game view
    toggleGame()
    // Player is joined in the game room
    state.peerStatus.isJoined = true
    // sending the joining status to all peers
    message = {
        type: "joinGame",
        username: state.username,
        gameMode: true,
        id: state.peerId
    }
    console.log('---------------------------------------')
    sendBroadcast(message)

}

// Setting of the score table on the init of game mode
function scoreSetting() {
    console.log('------------- Score Settings -------------')
    if (!state.peerStatus.isStarted) {
        var usernamesIterator = state.usernames.values()
        state.voteSystem.voteList.set(state.username, 0)
        for (let i = 0; i < state.peers.size; i++) {
            var player = usernamesIterator.next().value
            console.log('Init scores and votes for ' + player)
            state.gameStatus.scores.set(player, 0)
            state.voteSystem.voteList.set(player, 0)
        }
    } else {
        console.log('isStarted is true, so the game can not have new entries')
    }
    peerInfo()
    console.log('-----------------------------------------')
}

// Propagate the draw from state.gameStatus.painter to competitors
function propagateDraw(x, y, offsetX, offsetY) {
    if (state.gameStatus.painter == state.username) {
        sendBroadcast({
            type: "draw",
            x : x,
            y : y,
            offsetX : offsetX,
            offsetY : offsetY,
            id: state.peerId,
            vector: state.vectorClock.get(state.peerId),
        })
    }
}

// propagate the clean of paper from painter to competitors
function propagateClean() {
    if (state.gameStatus.painter == state.username) {
        sendBroadcast({
            type: "clean",
            id: state.peerId,
            vector: state.vectorClock.get(state.peerId),
        })
    }
}

// Service function to display in the console the own information
function peerInfo() {
    console.log('------------- Peers info -------------')
    peersIds = state.peers.keys()
    console.log('Peers connected in the same mesh:')
    for (let i = 0; i < state.peers.size; i++) {
        var currentId = peersIds.next().value
        console.log("Peer id" + currentId + " => " + state.usernames.get(currentId))
        console.log('Score of ' + state.usernames.get(currentId) + " is " + state.gameStatus.scores.get(state.usernames.get(currentId)))
        if (state.voteSystem.voteList.get(state.usernames.get(currentId)) == undefined) {
            state.voteSystem.voteList.set(state.usernames.get(currentId), 0)
        }
        console.log('Votes of ' + state.usernames.get(currentId) + " are " + state.voteSystem.voteList.get(state.usernames.get(currentId)))
    }
    console.log('--------------------------------------')

}

// Setter for isWaitingJoin value for the current peer
function setWaitingJoin(value) {
    state.peerStatus.isWaitingJoin = value
}

// Manage the leave of a player
function manageLeave(room, client) {
    console.log('------------ Crash or Disconnect management ---------------')
    var leaver = state.usernames.get(client)
    console.log('Leaver is: ', leaver)
    if(leaver == undefined || leaver == null) return 0 // user is not connected
    console.log('Client ' + client + " is leaving from room " + room)
    console.log('Current data: ')
    console.log('Usernames size: ' + state.usernames.size)
    console.log('Priorities size: ' + state.prioritySystem.priorities.size)
    console.log('state.peers size: ' + state.peers.size)
    console.log('Ids collections length: ' + state.ids.length)
    if (state.gameStatus.isGameMode) {
        console.log('Score size: ' + state.gameStatus.scores.size)
             
    }
    state.usernames.delete(client)
    state.prioritySystem.priorities.delete(client)
    state.peers.delete(client)
    state.gameStatus.scores.delete(leaver)
    state.ids = state.ids.filter(function (value, index, arr) {
        return value != client
    });
    console.log('After delete data: ')
    console.log('Usernames size: ' + state.usernames.size)
    console.log('Priorities size: ' + state.prioritySystem.priorities.size)
    console.log('state.peers size: ' + state.peers.size)
    console.log('Ids collections length: ' + state.ids.length)
    // for the lobby content
    modifyContentLobby(state.usernames)
    if (state.gameStatus.isGameMode) {
        // we need to update the game view too
        state.gameStatus.scores.delete(leaver)
        console.log('Score size: ' + state.gameStatus.scores.size)
        // If the peer waiting to join other peer
        if (state.peerStatus.isWaitingJoin) {
            if ((state.peers.size + 1) <= state.gameStatus.counterGameMode && !state.peerStatus.isStarted) {
                // peers are in the game mode
                console.log('Game mode: Available')
                sendBroadcast({
                    type: 'availableGame',
                    id: state.peerId,
                    vector: state.vectorClock.get(state.peerId),
                })
                toggleGameButton(false)

            } else {
                toggleGameButton(true)
            }
        }
        if (state.peers.size + 1 <= 2) {
            // not enough competitors
            Swal.fire({
                icon: 'error',
                title: 'Room ' + room + ' with not enough players',
                text: 'Your game was automatically close for not enough players',
                confirmButtonColor: '#f0ad4e',
            })
            cleanLocal()
            toggleHomepage()
            state.socket.disconnect()
            state.socket = io.connect()
            initSocketHandlers()
            disconnectPeer()
            removePeer()
        } else {
            if (leaver != undefined)
                notifyChat('Player ' + leaver + " is leaving the chat")
        }
        // If the peer voted but needs the vote from other peer
        if (state.voteSystem.isWaitingVote || (state.voteSystem.numVotes > 0 && state.voteSystem.isWaitingVote) || state.voteSystem.isVotingSession) {
            console.log('Reset vote system')
            // if you press the start game during disconnection
            // every node needs to be reset the vote, that's because
            // the total votes consider the voting of the crashed client
            // and we didn't know a priori if he voted or not
            resetVoteSystem(leaver) // we need to reset the vote system
        }
        // Competitor is the leaver
        updateScore(state.gameStatus.scores)
    }
    console.log('------------------------------------------------------')

}


function ping() {
    var connections = state.peers.values()
    console.log('ping!')
    console.log(state.peers.size)
    if (connections == undefined || connections == null) return 0;
    for (let i = 0; i < state.peers.size; i++) {
        var connection = connections.next().value
        console.log('connection:' + connection)
        connection.send({
            type: "ping",
            username: state.username,
            id: state.peerId,
        })
    }

}

function localState(){
    console.log('--------- Local State Checking --------------')
    console.log('isStarted value: ' + state.peerStatus.isStarted)
    console.log('isJoined value: ' + state.peerStatus.isJoined)
    console.log('isGameMode value: ' + state.gameStatus.isGameMode)
    console.log('isVoted value: ' + state.voteSystem.isVoted)
    console.log('state.voteSystem.isWaitingVote value: ' + state.voteSystem.isWaitingVote)
    console.log('isWaitingJoin value: ' + state.peerStatus.isWaitingJoin)
    console.log('Number of votes: ' + state.voteSystem.numVotes)
    console.log('Current own vote: ' + state.voteSystem.vote)
    console.log('isRemoved value: ' + state.peerStatus.isRemoved)
    console.log('isInitiator value:'  + state.isInitiator)
    console.log('Painter value: ' + state.gameStatus.painter)
    console.log('Peers in gameMode: ' + state.gameStatus.counterGameMode)
    console.log('Number of peer in the mesh: ' + (state.peers.size + 1))
    console.log('Number of peers ids: ' + state.ids.length)
    console.log('Scores elements: ' + state.gameStatus.scores.size)
    console.log('Usernames size of other peers: '  + state.usernames.size)
    console.log('Username of own peers: ' + state.username)
    console.log('Room ID: ' + state.roomId) 
    console.log('---------------------------------------------')
}


function receivePing(data){
    manageLeave(state.roomId, data.id)
}

/* ----------------- */
/*   Window Handlers */
/* ----------------- */

window.onbeforeunload = function (e) {
    ping()
    state.peer.disconnect()
}


