// This script is for game management, connections making is in peer.js


/* ------------------- */
/*    Initial Score    */
/* ------------------- */

// First display of the content Score
gameScore = document.getElementById('game-score');
contentScore = "\nScore\n" +
    "-----------\n";
gameScore.value = contentScore;

/* ------------------- */
/*   Canvas Management */
/* ------------------- */

// canvas an context declaration and init a void coordinate of the first point of canvas.
var canvas = document.getElementById('paper')
var ctx = canvas.getContext('2d')
var coord = { x: 0, y: 0 }

// clean button 
cleanCanvas = document.getElementById('delete-sweep')

// This function is based on the event of "line start"
function start(event) {
    document.addEventListener('mousemove', draw);
    reposition(event);
}

// Reposition the line respect the mouse on canvas environment 
function reposition(event) {
    coord.x = event.clientX - canvas.offsetLeft;
    coord.y = event.clientY - canvas.offsetTop - 60;
}

// This function is based on the event of "line end"
function stop() {
    document.removeEventListener('mousemove', draw);
}

// clean the paper from every lines recently written
function clean() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    propagateClean()
}

// clean the paper only in local mode
function cleanLocal() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Function to draw a line of 5 pixel, black and rounded from (x,y) to (x',y') with (x',y') the output of the reposition on coord
// from the event (new point). The line is designed with lineTo method on a 2d context previously declared.
function draw(event) {
    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';
    x = coord.x
    y = coord.y
    ctx.moveTo(coord.x, coord.y);
    ctx.lineTo(event.offsetX, event.offsetY);
    coord.x = event.offsetX
    coord.y = event.offsetY
    offsetX = coord.x
    offsetY = coord.y
    ctx.stroke();
    propagateDraw(x,y,offsetX, offsetY)
}

// Function to draw who did the painter (if you are a competitor)
function onDraw(data) {
    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';
    coord.x = data.x
    coord.y = data.y
    ctx.moveTo(coord.x, coord.y);
    ctx.lineTo(data.offsetX, data.offsetY);
    coord.x = data.offsetX
    coord.y = data.offsetY
    ctx.stroke();
}

function onClean(data) {event
    if (data.id != null || data.id != undefined) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
        console.log('Illegal message format')
    }
}
// Activate the drawing on the paper
function activateCanvas() {
    console.log('---------- Activated canvas ----------')
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mouseup', stop);
    cleanCanvas.addEventListener('click', clean);
    console.log('--------------------------------------')

}

// Deactivate the drawing on the paper, we will check only the showing mode
function deactivateCanvas() {
    console.log('---------- Activated canvas ----------')
    canvas.removeEventListener('mousedown', start);
    canvas.removeEventListener('mouseup', stop)
    console.log('--------------------------------------')
}

/* ------------------- */
/*   Utility Functions */
/* ------------------- */

// generate a random element between x and y 
function generateRandom(x, y) {
    if (y > x) {
        return x + Math.floor(Math.random() * (y - x));
    } else {
        return -1;
    }
}
