// this script is an utility one for the front-end DOM management not associated with peers connection (peer.js).

homepage = document.getElementById('homepage-content')
lobby = document.getElementById('lobby-content')
game = document.getElementById('game-content')
lobbyName = document.getElementById('lobby-name')
lobbyButton = document.getElementById('lobby-button')
lobbyExitButton = document.getElementById('lobby-exit-button')
userList = document.getElementById('user-list')
mainNavbar = document.getElementById('main-nav')
playButton = document.getElementById('play-button')
startButton = document.getElementById('start-game')

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
    setTimeout(function() {
        styler.parentNode.removeChild(styler);
    }, 2000);
    document.body.appendChild(styler);
})

lobbyExitButton.addEventListener('click', function(e) {
    console.log('Removing peer from the lobby...')
    removePeer();
    toggleHomepage();
})

lobbyButton.addEventListener('click', function(event){
    console.log('Joining in the game...')
    initGame()
})

startButton.addEventListener('click', function(event){
    console.log('Start Button clicked')
    initVote()
    // TO-DO: Setup the painter randomly and propagate it to each peer
    // than trasform the view of the painter peer in the correct one
    // Setup for the Guess word and propagate guess system
})

// Given the username maps, fill the content with the usernames list
function modifyContent(usernames) {
    console.log('Updating the content of the username list')
    usernameIterator = usernames.values()
    content = "Players:\n"
    for (let i = 0; i < usernames.size; i++) {
        content += usernameIterator.next().value + "\n"
    }
    console.log(content)
    userList.value = content
    // TO-DO: Change it to 3
    if(usernames.size >= 1){
        lobbyButton.disabled = false
    } else {
        lobbyButton.disabled = true
    }
}

// Changing the game content to the default view
function initGameContent(username, room){
    leftTitle = document.getElementById('left-title')
    leftTitle.innerHTML = "Room: " + room
    startGameButton = document.getElementById('start-game')
    startGameButton.disabled = true
    startGameButton.innerHTML = "Waiting players"
    // Making notify the enter of the user
    notifyEnter(username)
}

// Notify in the chat that username is enter in the game room
function notifyEnter(username){
    chatContent = document.getElementById('content-chat')
    var element = document.createElement('div')
    element.classList.add('msg')
    element.classList.add('left-msg')
    element.style.color = "grey"
    var contentElement = document.createTextNode('Player ' + username + " joining in the chat")
    element.appendChild(contentElement)
    chatContent.appendChild(element)
}

// Updating the score view
function updateScore(scores){
    gameScore = document.getElementById('game-score')
    gameScore.value = "\nScore\n" +
    "-----------\n";
    var usernames = scores.keys()
    for(let i = 0; i < scores.size; i++){
        var username = usernames.next().value
        gameScore.value += "\n" + username + ": " + scores.get(username) + " points"
    }
}

function updatePainter(){
    console.log('Painter view...')
}

function updateCompetitor(){
    console.log('Competitor view...')
}

// Changing the default view to Home Mode
window.addEventListener('load', (event) => {
    // default view is on the homepage
    toggleHomepage()
});

// Changing the view to Homepage Model
function toggleHomepage() {
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
    game.style.display = 'none'
    lobby.style.display = 'block'
    document.body.style.backgroundColor = "#ffc107";
    lobbyName.innerHTML = roomId // setup the roomId
}


// Changing the views to Game mode
function toggleGame() {
    // this is the dynamic content of the game from the lobby
    homepage.style.display = 'none'
    lobby.style.display = 'none'
    mainNavbar.style.display = 'none'
    game.style.display = 'block'
}

// change the availability of the game mode
function toggleGameButton(value){
    console.log('Toggle Game Button started...')
    // manual toggle
    if(value != undefined){
        startButton.disabled = value
        if(!value){
            startButton.innerHTML = "Start Game"
        } else {
            startButton.inneHTML = "Waiting players"
        }
    } else {
        // automatic toggle
        if(startButton.disabled){
            startButton.disabled = false
            startButton.innerHTML = "Start Game"
        } else {
            startButton.disabled = true
            startButton.inneHTML = "Waiting players"
        }
    }
}

