
// configuration for ICE Servers for peer connection bidings
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

// asynchronious function to make a call for initializator peer
async function makeCall() {
    username = document.getElementById('create-username').value
    if(username == "" || username == null){
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'You need to insert data before submit!',
            confirmButtonColor: '#f0ad4e',
          })
        return 0;
    }
    console.log('Making call for peer connection.')
    const peerConnection = new RTCPeerConnection(configuration);
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
}

createRoom = document.getElementById('create-button')
createRoom.addEventListener("click", makeCall);

