// this script is an utility one for the front-end DOM management not associated with peers connection (peer.js).

homepage = document.getElementById('homepage-content')
lobby = document.getElementById('lobby-content')
game = document.getElementById('game-content')
lobbyName = document.getElementById('lobby-name')
lobbyButton = document.getElementById('lobby-button')
lobbyExitButton = document.getElementById('lobby-exit-button')
userList = document.getElementById('user-list')

// Copying service for room sharing with temporal notify on the screen
lobbyName.addEventListener('click', (event) => {
    var roomName = lobbyName.innerHTML
    // Create new element
    var el = document.createElement('textarea');
    // Set value (string to be copied)
    el.value = roomName;
    // Set non-editable to avoid focus and move outside of view
    el.setAttribute('readonly', '');
    el.style = { position: 'absolute', left: '-9999px' };
    document.body.appendChild(el);
    // Select text inside element
    el.select();
    // Copy text to clipboard
    document.execCommand('copy');
    // Remove temporary element
    document.body.removeChild(el);
    // making a new temporal alert to notify the copied status
    var styler = document.createElement("div");
    styler.setAttribute("style", "background-color: #f7f7f7; padding: 2px -100px; color: black; display: table; text-align: center; margin: auto; width:50%; margin: 1px solid black; border-radius: 10px; box-shadow: 5px 7px rgb(0, 0, 0); ");
    styler.innerHTML = "Room name copied!";
    setTimeout(function () {
        styler.parentNode.removeChild(styler);
    }, 2000);
    document.body.appendChild(styler);
})

lobbyExitButton.addEventListener('click', function(e){
    console.log('Removing peer from the lobby...')
    removePeer();
    toggleHomepage();
})

// Given the username maps, fill the content with the usernames list
function modifyContent(usernames){
    console.log('Updating the content of the username list')
    usernameIterator = usernames.values()
    content = "Players:\n"
    for(let i = 0; i < usernames.size; i++){
        content+= usernameIterator.next().value + "\n"
    }
    console.log(content)
    userList.value = content
}

// Changing the default view to Home Mode
window.addEventListener('load', (event) => {
    // default view is on the homepage
    toggleHomepage()
});

function toggleHomepage(){
    // default view is on the homepage
    console.log('Loading homepage content')
    homepage.style.display = 'block'
    document.body.style.backgroundColor = "white";
    lobby.style.display = 'none'
    game.style.display = 'none'
}
// Changing the view to Lobby Model
function toggleLobby(roomId, username) {
    // this is the dynamic content of the lobby from the homepage
    $('#modal-join').modal('hide')
    $('#modal-create').modal('hide')
    console.log('Loading lobby content')
    homepage.style.display = 'none'
    lobby.style.display = 'block'
    document.body.style.backgroundColor = "#ffc107";
    lobbyName.innerHTML = roomId // setup the roomId
}


// Changing the views to Game mode
function toggleGame(roomId, painter, competitors) {
    // this is the dynamic content of the game from the lobby
}


// TO-DO: Complete it
lobbyButton.addEventListener('click', function (e) {
})
