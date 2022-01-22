
// using some of the most common STUN Servers to retrieve our public IP and port
const configuration = { 'iceServers': [{
    url: 'stun:stun.l.google.com:19302'
  },{
    url: 'stun:stun.anyfirewall.com:3478'
  },{
    url: 'turn:turn.anyfirewall.com:443?transport=tcp',
    credential: 'webrtc',
    username: 'webrtc'
  }]
}

// Global Variables
var peerConnection; // peer connection for P2P game communication
var channelReady; // if the channel is ready and user is in the lobby
var isInitiator; // if the user is the creator and initial painter of the game
var TURNReady; // if the TURN communication setup is done
var offerChannel; // offerer channel
var answerChannel; // answer channel
// Default openess connection to set default port and IP (not signalling) for P2P connection
var socket = io.connect() // socket opening
createRoom = document.getElementById('create-button')
createRoom.addEventListener("click", makeLobby); // create Lobby as the initializator

// TO-DO: Setting Id by request input or randomly (?)
function settingId(){
  return '_' + Math.random().toString(36).substr(2, 9);
}

// procedure to estabilish a connection room to make a lobby
function makeLobby(){
   username = document.getElementById("create-username")
   if(username == "" || username == null){
    Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'You need to insert data before submit!',
        confirmButtonColor: '#f0ad4e',
      })
    return 0; // Avoid connection making for no data issue
    }
   // Setting random Id for the room. People must use it to join with friends
   roomId = settingId() 
   // Opening RTC Connection
   try{
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

      offerChannel.onmessage = (event) =>{
        console.log("Offerer received message: " + event.data)
      }

      offerChannel.onerror = (eventError) => {
        console.log("Data channel error: " + eventError )
      }

      offerChannel.onclose = () =>{
        console.log("Data Channel closed")
      }

      // Define Answer to offer
      peerConnection.ondatachannel = (event) =>{
          answerChannel = event.channel;

        // listeners of the answer channel

        answerChannel.onopen = (event) =>{
          answerChannel.send('Answer channel: Open')
        }

        answerChannel.onmessage = async (event) =>{
          try{
            message = event.data
            console.log(message + ": " +  event);
            // TO-DO: setting chat in lobby page (?)
          } catch (error){
            console.log('Error onMessage for answer channel: ' + error)
          }
        }
        console.log('Answer channel created...')
      }

   } catch(error){
     console.log('Connection failed: ' + e.message);
     Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: 'Connection failed, you cannot be able to contact signaling server!',
      confirmButtonColor: '#f0ad4e',
    })
   }
}

// ICE candidates handler
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
      room
    );
  } else {
    console.log("End of candidates.");
  }
}

// Socket listeners


// Event to trigger the room creation and setting the client as the initiator
socket.on("init", function (room) {
  console.log("Created room " + room);
  isInitiator = true;
});



