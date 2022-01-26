// This script is for game management, connections making is in peer.js

// Canvas for drawing or visualize the painter output
canvas = document.getElementById('paper');
// Score table
gameScore = document.getElementById('game-score');

// TO-DO: Fill it with peers
contentScore = "\nScore\n" +
    "-----------\n";
gameScore.value = contentScore;

function generateRandom(x, y) {
    if (y > x) {
        return x + Math.floor(Math.random() * (y - x));
    } else {
        return -1;
    }
}

// TO-DO: Function to manage view and add a peer or own message
function addMessage(message, username, number, position) {

}