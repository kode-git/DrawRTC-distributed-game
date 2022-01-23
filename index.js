// this script is an utility one for the front-end DOM management not associated with peers connection (peer.js).

homepage = document.getElementById('homepage-content')
lobby = document.getElementById('lobby-content')
game = document.getElementById('game-content')
lobbyName = document.getElementById('lobby-name')
window.addEventListener('load', (event) => {
    // default view is on the homepage
    console.log('Loading homepage content')
    homepage.style.display = 'block'
    document.body.style.backgroundColor = "white";
    lobby.style.display = 'none'
    game.style.display = 'none'
  });


function toggleLobby(roomId, username){
    // this is the dynamic content of the lobby from the homepage
    $('#modal-join').modal('hide')
    $('#modal-create').modal('hide')
    console.log('Loading lobby content')
    homepage.style.display = 'none'
    lobby.style.display = 'block'
    document.body.style.backgroundColor = "#ffc107";
    lobbyName.innerHTML = roomId // setup the roomId
}


function toggleGame(roomId, painter, competitors){
    // this is the dynamic content of the game from the lobby
}

