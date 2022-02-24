// this script is an utility one for the front-end DOM management not associated with peers connection (peer.js).


// DOM main components for the event management system
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
sendButton = document.getElementById('send-chat')
inputChat = document.getElementById('input-chat')
contentChat = document.getElementById('content-chat')


  
// Avatar image used from the player in the chat 
avatarNumber = randomIntFromInterval(1,9)

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

// Adding click listener on the lobbyExitButton
lobbyExitButton.addEventListener('click', function (e) {
    console.log('Removing peer from the lobby...')
    removePeer();
    toggleHomepage();
})

// Adding click listener on the lobby Button
lobbyButton.addEventListener('click', function (event) {
    console.log('Joining in the game...')
    initGame()
})

// Adding click listener on the startButton
startButton.addEventListener('click', function (event) {
    console.log('Start Button clicked')
    startButton.style.display = 'none'
    document.getElementById('waiting').innerHTML = "Waiting other players..."
    initVote()
})

// Adding click listener on the sendButton
sendButton.addEventListener('click', function (event) {
    submitMessage()
})


// function reset the star button
function resetStartButton(){
    startButton.style.display = 'block'
    document.getElementById('waiting').innerHTML = ""
    document.getElementById('word-guess').innerHTML = ""
    document.getElementById('painter-tools').style.display = 'none'
    deactivateCanvas()
}

// Avoid the submit message for refresh the page (losing the session)
$('#input-chat').keypress(
    function (event) {
        if (event.which == '13') {
            event.preventDefault()
            submitMessage()
        }
    });

// Submit the message on the chat
function submitMessage() {
    if ($('#input-chat').val() == "") {
        console.log('Not message taken, the field is void')
    } else {
        var message = $('#input-chat').val()
        console.log("Message sent: " + message)
        $('#input-chat').val("") // clear the field
        // make a new field in the chat
        putMessage(message) // own view
        propagateChatMessage(avatarNumber, message) // other views
    }
}

// This function is to put an own message in the chat
function putMessage(message) {
    var contentChat = document.getElementById('content-chat')
    var tag = document.createElement('div') // right-msg div
    // adding class to tag
    tag.classList.add('msg')
    tag.classList.add('right-msg')
    var avatar = document.createElement('div') // avatar div
    avatar.classList.add('msg-img')
    avatar.style.backgroundImage = "url(avatars/" + avatarNumber +".png)"
    var bubble = document.createElement('div') // msg-bubble div
    bubble.classList.add('msg-bubble')

    var messageContent = document.createElement('div') // msg-text
    messageContent.classList.add('msg-text')
    var text = document.createTextNode("You: " + message)
    messageContent.appendChild(text)
    bubble.appendChild(messageContent)
    tag.appendChild(avatar) // Avatar before the bubble
    tag.appendChild(bubble) // Bubble after the avatar
    contentChat.appendChild(tag)
    chatContent.scrollTop = chatContent.scrollHeight;
}



// Propagate a message of a player
function putPropagatedMessage(avatar, username, message){
    var contentChat = document.getElementById('content-chat')
    var tag = document.createElement('div') // right-msg div
    // adding class to tag
    tag.classList.add('msg')
    tag.classList.add('left-msg')
    var avatarContent = document.createElement('div') // avatar div
    avatarContent.classList.add('msg-img')
    avatarContent.style.backgroundImage = "url(avatars/" + avatar +".png)"
    var bubble = document.createElement('div') // msg-bubble div
    bubble.classList.add('msg-bubble')

    var messageContent = document.createElement('div') // msg-text
    messageContent.classList.add('msg-text')
    var text = document.createTextNode(username  + ": " + message)
    messageContent.appendChild(text)
    bubble.appendChild(messageContent)
    tag.appendChild(avatarContent) // Avatar before the bubble
    tag.appendChild(bubble) // Bubble after the avatar
    contentChat.appendChild(tag)
    chatContent.scrollTop = chatContent.scrollHeight;

}

// Solve conflict visualization
function putPropagatedMessages(avatars, usernames, messages, username){
    // cleaning elements 
    elements = document.getElementsByClassName('msg')
    for(let i = 0; i < elements.length; i++){
        if(elements[i].classList.contains('notify-el')){
            // do nothing, it is a notify
        } else {
            elements[i].remove()
        }
    }
    for(let j = 0; j < usernames.length; j++){
        if(usernames[j] == username){
            putMessage(messages[j])
        } else {
            putPropagatedMessage(avatars[j], usernames[j], messages[j])
        }
    }

}
// Given the username maps, fill the content with the usernames list
function modifyContentLobby(usernames) {
    console.log('Updating the content of the username list')
    usernameIterator = usernames.values()
    content = "Players:\n"
    for (let i = 0; i < usernames.size; i++) {
        content += usernameIterator.next().value + "\n"
    }
    console.log(content)
    userList.value = content
    // Milestone: How many players to init setup
    if (usernames.size >= 3) {
        lobbyButton.disabled = false
    } else {
        lobbyButton.disabled = true
    }
}

// Changing the game content to the default view
function initGameContent(username, room) {
    leftTitle = document.getElementById('left-title')
    leftTitle.innerHTML = "Room: " + room
    startGameButton = document.getElementById('start-game')
    startGameButton.disabled = true
    startGameButton.innerHTML = "Waiting players"
    // Making notify the enter of the user
    notifyEnter(username)
}

// Notify in the chat that username is enter in the game room
function notifyEnter(username) {
    chatContent = document.getElementById('content-chat')
    var element = document.createElement('div')
    element.classList.add('msg')
    element.classList.add('left-msg')
    element.classList.add('notify-el')
    element.style.color = "grey"
    var contentElement = document.createTextNode('Player ' + username + " joining in the chat")
    element.appendChild(contentElement)
    chatContent.appendChild(element)
    chatContent.scrollTop = chatContent.scrollHeight;
}

// Notify a general message in the game room
function notifyChat(message){
    chatContent = document.getElementById('content-chat')
    var element = document.createElement('div')
    element.classList.add('msg')
    element.classList.add('left-msg')
    element.style.color = "grey"
    var contentElement = document.createTextNode(message)
    element.appendChild(contentElement)
    chatContent.appendChild(element)
    chatContent.scrollTop = chatContent.scrollHeight;
}

// Updating the score view
function updateScore(scores) {
    gameScore = document.getElementById('game-score')
    gameScore.value = "\nScore\n" +
        "-----------\n";
    var usernames = scores.keys()
    for (let i = 0; i < scores.size; i++) {
        var username = usernames.next().value
        if(username != undefined){ 
            gameScore.value += "\n" + username + ": " + scores.get(username) + " points"
        }
    }
}

// Update the painter view
function updatePainter() {
    var guess = getGuessWord()
    console.log('Setting painter view...')
    document.getElementById('waiting').innerHTML = "You are the painter. Quick, draw!"
    document.getElementById('word-guess').innerHTML = "Guess Word: " + guess
    document.getElementById('painter-tools').style.display = 'block'
    removePainterScore()
    activateCanvas()
    console.log('Panter has actually the correct view')
}

// Update competitor view
function updateCompetitor() {
    console.log('Setting competitor view...')
    document.getElementById('painter-tools').style.display = 'none'
    document.getElementById('word-guess').innerHTML = ""
    document.getElementById('waiting').innerHTML = "You are the competitor. Quick, guess!"
    deactivateCanvas()
    console.log('Competitor has actually the correct view')

}

// Update the guess word with a new one
function updateGuessContent(guess){
    document.getElementById('word-guess').innerHTML = "Guess Word: " + guess
}

// cleaning the content of the peer for let him to restart the game 
function cleanContent(){
    cleanLobby()
    cleanScore()
    cleanPainter()
    cleanChat()
}

// Clean the lobby content at the end of a game (for the local peer)
function cleanLobby(){
    userList.value = "Players:\n"
}

// function clean painter dynamic elements (for the local peer)
function cleanPainter(){
    document.getElementById('word-guess').innerHTML = ""
}

// Clean the score table at the end of a game (for the local peer)
function cleanScore(){
    gameScore = document.getElementById('game-score')
    gameScore.value = "\nScore\n" +
        "-----------\n";
}
// clean the chat content at the end of a game (for the local peer)
function cleanChat(){
    document.getElementById('content-chat').innerHTML = ""
}

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


// Changing the views to Game mode in default view
function toggleGame() {
    // this is the dynamic content of the game from the lobby
    homepage.style.display = 'none'
    lobby.style.display = 'none'
    mainNavbar.style.display = 'none'
    game.style.display = 'block'
    document.getElementById('painter-tools').style.display = 'none'
    startButton.style.display = "block"
    document.getElementById('waiting').innerHTML = ""
    document.getElementById('word-guess').innerHTML = ""
    deactivateCanvas()
}

// change the availability of the game mode
function toggleGameButton(value) {
    console.log('Toggle Game Button started...')
    // manual toggle
    if (value != undefined) {
        startButton.disabled = value
        if (!value) {
            startButton.innerHTML = "Start Game"
            startButton.style.cursor = "pointer"
            setWaitingJoin(false)
        } else {
            startButton.inneHTML = "Waiting players"
            startButton.style.cursor = "not-allowed"
            setWaitingJoin(true)
        }
    } else {
        // automatic toggle
        if (startButton.disabled) {
            startButton.disabled = false
            startButton.innerHTML = "Start Game"
            setWaitingJoin(false)
        } else {
            startButton.disabled = true
            startButton.inneHTML = "Waiting players"
            setWaitingJoin(true)
        }
    }
}

// Random integer between min and max int value
function randomIntFromInterval(min, max) { // min and max included 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

// Changing the default view to Home Mode
window.addEventListener('load', (event) => {
    // default view is on the homepage
    toggleHomepage()
});


window.onresize = function(){
    if($(document).width() < 650){
        document.getElementById("background-image").src = "background-mobile.png"
    } else {
        document.getElementById("background-image").src = "background.png"
    }

    if($(document).width() < 1560){
        document.getElementById('game-score').cols = 30;
    }
}
