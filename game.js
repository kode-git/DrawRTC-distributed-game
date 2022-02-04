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

var canvas = document.getElementById('paper')
var ctx = canvas.getContext('2d')
var coord = {x: 0, y: 0}

function activateCanvas(){
    console.log('Activated canvas...')
    function start(event) {
        document.addEventListener('mousemove', draw);
        reposition(event);
    }
    
    // Reposition the line respect the mouse on canvas environment 
    function reposition(event) {
        coord.x = event.clientX - canvas.offsetLeft;
        coord.y = event.clientY - canvas.offsetTop;
        console.log(coord)
    }

    function stop() {
        document.removeEventListener('mousemove', draw);
    }

    function draw(event) {
        ctx.beginPath();
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'black';
        ctx.moveTo(coord.x, coord.y);
        reposition(event);
        ctx.lineTo(coord.x, coord.y);
        ctx.stroke();
    }

    // resie the canvas context on the windows width and height
    function resize() {
        ctx.canvas.width = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
      }
    // initial resize
    resize();
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mouseup', stop);
    window.addEventListener('resize', resize);
}


function deactivateCanvas(){
}



/* ------------------- */
/*   Utility Functions */
/* ------------------- */

function generateRandom(x, y) {
    if (y > x) {
        return x + Math.floor(Math.random() * (y - x));
    } else {
        return -1;
    }
}
