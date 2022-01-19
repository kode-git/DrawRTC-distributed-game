
// configuration for ICE Servers for peer connection bidings in NAT traversal
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

const peerConnection;

createRoom = document.getElementById('create-button')
createRoom.addEventListener("click", makeCall);

