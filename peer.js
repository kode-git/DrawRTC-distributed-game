
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

// Global Variables
var peerConnection = null; // peer connection for P2P game communication
var channelReady = false; // if the channel is ready and user is in the lobby
var isInitiator = false; // if the user is the creator and initial painter of the game
var isStarted = false; // if the lobby session is started
var offerChannel; // offerer channel
var answerChannel; // answer channel
var stateConnection; // state of the connection
var roomId; // Peer will connect to this roomId
// Default openess connection to set default port and IP (not signalling) for P2P connection
var socket = io.connect() // socket opening
createRoom = document.getElementById('create-button') // create button
createRoom.addEventListener("click", makeLobby); // create Lobby as the initializator
joinRoom = document.getElementById('join-button') // join button
joinRoom.addEventListener("click", joinLobby) // join in an existing lobby

// TO-DO: Setting Id by request input or randomly (?)
function settingId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

// Socket listeners

// Event to handle the room creation and setting the client as the initiator
socket.on("init", function (room) {
  console.log("Created room " + room);
  isInitiator = true;
  stateConnection = true
  toggleLobby(room)
});


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

// Joining handler for new peer in the lobby
socket.on("joined", function (room, client) {
  console.log('New peer added in the room ' + room + ", his id is:" + client)
  channelReady = true
  const signalingChannel = new SignalingChannel(remoteClientId);
  signalingChannel.addEventListener('message', message => {
      console.log('Message received is: ' + message)
  });

  // Send an asynchronous message to the remote client
  signalingChannel.send('Hello!');
})

// Adding client handler for new connection requirement
socket.on('add', function (room) {
  console.log('Starting init connection')
  initConnection()
})

// Event to handle the user leaving in the same room of the current client
socket.on('leave', function (client) {
  console.log('The client ' + client + " is leaving from the room")
})

// When the client receive an offer from an other one for connection binding
socket.on('offer', function (message, room) {
  console.log('Client receive an offer for the room: ' + room)
  if (!isInitiator && !isStarted) {
    // we have the condition to trigger the offer
    initConnection() // setting RTCPeerConnection for the client
  }
  // Setting Session Description
  peerConnection.setRemoteDescription(new RTCSessionDescription(message));
  // Answer to the offer
  doAnswer();
})

// When the client receive the answer (from an offer) and set the WebRTC Session Description
socket.on('answer', function (message, room) {
  console.log('Received answer from the offer, setting WebRTC Session Description')
  peerConnection.setRemoteDescription(new RTCSessionDescription(message))
})

// Candidate handler for add a new ICE candidate to the Peer Connection
socket.on("candidate", function (message, room) {
  var icecandidate = new RTCIceCandidate({
    sdpMlineIndex: message.label, // label 
    candidate: message.candidate, // candidate 
  })
  if (peerConnection != null) {
    peerConnection.addIceCandidate(icecandidate)
  }
})
// Procedure to estabilish a connection room to make a lobby
function makeLobby() {
  username = document.getElementById("create-username").value
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
  if (!stateConnection) {
    // peer is not connected yet
    // do signaling
    socket.emit("create", roomId, username)
  }
}

// Function to join in an existing lobby
function joinLobby() {
  username = document.getElementById("join-username").value
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
  if (!stateConnection && !isInitiator) {
    socket.emit("join", roomId, username)
    sendMessage("Join User in ", roomId)
    stateConnection = true
    toggleLobby(roomId)
  }
}


// Making a RTC Peer Connection with Offer and Answer channel setting
function createPeerConnection() {
  // Opening RTC Connection
  try {
    peerConnection = new RTCPeerConnection(configuration)
    peerConnection.onicecandidate = handleIceCandidate;
    console.log('Connection with WebRTC... OK')

    // Define Offer
    offerChannel = peerConnection.createDataChannel("Offer")
    console.log('Offer channel created...')
    // Data Channels listeners
    offerChannel.onopen = (event) => {
      console.log('Event trigger onOpen: ' + event)
    }

    offerChannel.onmessage = (event) => {
      console.log("Offerer received message: " + event.data)
    }

    offerChannel.onerror = (eventError) => {
      console.log("Data channel error: " + eventError)
    }

    offerChannel.onclose = () => {
      console.log("Data Channel closed")
    }

    // Define Answer to offer
    peerConnection.ondatachannel = (event) => {
      answerChannel = event.channel;

      // listeners of the answer channel

      answerChannel.onopen = (event) => {
        answerChannel.send('Answer channel: Open')
      }

      answerChannel.onmessage = async (event) => {
        try {
          message = event.data
          console.log(message + ": " + event);
          // TO-DO: setting chat in lobby page (?)
        } catch (error) {
          console.log('Error onMessage for answer channel: ' + error)
        }
      }
      console.log('Answer channel created...')
    }

  } catch (error) {
    console.log('Connection failed: ' + e.message);
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'Connection failed, you cannot be able to contact signaling server!',
      confirmButtonColor: '#f0ad4e',
    })
  }
}

// Sending a message to a room
function sendMessage(message, room) {
  console.log("Client sending message: ", message, room);
  socket.emit("broadcast", message, room);
}

// ICE candidates handlers
function handleIceCandidate(event) {
  console.log("ICE candidate event is: ", event);
  if (event.candidate) {
    sendMessage(
      {
        type: "candidate",
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate,
      },
      roomId
    );
  } else {
    console.log("End of candidates.");
  }
}

// Error handler on Offer and Answer Channel
function handleOfferError(error) {
  console.log('Error on offer channel: ' + error)
}

function handleAnswerError(error) {
  console.log('Error on answer channel' + error)
}

// Set Local Description and send a message to a room 
function setLocalForwardMessage(sessionDescription) {
  peerConnection.setLocalDescription(sessionDescription)
  sendMessage(sessionDescription, roomId)
}

// If initiator, it need to make the initial connection
function initConnection() {
  console.log("Init connection values: Started is ", isStarted + ", and ChannelReady is:" + channelReady);
  if (!isStarted && channelReady) {
    console.log("Starting creation of Peer Connection");
    createPeerConnection();
    isStarted = true;
    console.log("isInitiator value: ", isInitiator);
    if (isInitiator) {
      // if is the initiator, he must do offer for P2P connection
      doOffer();
    }
  }
}

// Offer and Answer functions

// do an offer with trigger error in case of failure
function doOffer() {
  console.log("Sending offer to peer")
  peerConnection.createOffer(setLocalForwardMessage, handleOfferError)
}

function doAnswer() {
  console.log("Sending answer to the peer")
  peerConnection.createAnswer().then(
    setLocalForwardMessage,
    handleAnswerError,
  );
}

// When the game end or when the user intentionally end the connection
function dispose() {
  console.log("Dispose calling, client leaves")
  leaveSetup()
  // we need to inform the signaling room management for the user removing
  sendMessage("close", roomId)
}

// Procedure to do before the dispose action
function leaveSetup() {
  isStarted = false // connection is not started
  peerConnection.close() // connection peer closing
  peerConnection = null  // reset value to null for new connection setting
}

// Closing connection
window.onbeforeunload = () => {
  sendMessage("close", roomId);
}

// 


