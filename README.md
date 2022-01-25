# Quick, DrawRTC!
<p>
  <img src="https://img.shields.io/badge/build-passed-green" alt="alternatetext">
  <img src="https://img.shields.io/badge/status- dev-yellow" alt="alternatetext">
  <img src="https://img.shields.io/badge/version-1.0%20-blue" alt="alternatetext">
  <img src="https://img.shields.io/badge/Framework-WebRTC-orange" alt="alternatetext">
  <img src="https://img.shields.io/badge/Language-Javascript-red" alt="alternatetext">
</p>

<p align="center">
  <img style="width: 899px" src="background.png">
  <i>
    Annoying to play with the IA? Try the game with your friends and get the highest score! Good luck and have fun! &copy; Idea from Google
  </i>
</p>

### Technologies and Architecture

Quick, DrawRTC! is a distributed version on P2P-SIP infrastracture of <a href="https://quickdraw.withgoogle.com/">Quick,Draw!</a> using PeerJS, a library based on the famous framework WebRTC. It presents a lobby system via Socket.io and a signaling server to estabilish correctly connections between peers and share information among them. Mainly, the decentralized architecture lets the game indipendently from the server status with the exception on the new connections management. During the game, the security is guarantee from the isolated mesh network between peers of a same room. Peer network architecture pattern is mesh. It is because the game generally didn't exceeed on more than 10-15 players for session and scalability is not a real problem. Meanwhile, during the game session, security is guaranteed from the network isolation and malicious peers can't join to a game session directly because the game status is exclusively shared between the peers of the previously started lobby.

### Game Info

The game consists of a challenge with your friends. There is one painter and minimum two or more competitors for each game session. The painter needs to draw the upright word to guess in the distributed paper and competitors needs to guess the object before the opponents. The game continues since one of the competitors didn't obtain 10 points or when the painter click on the end button.

### Painter role

The word to guess is on the upright of the painter interface. There are no time limits for him, he can draw and cancel scribbles on the paper whenever. The scoring system doesn't include him for the game session, but he can arbitrarily decide to stop the game, fix the final scores and, consequently, define the winner of the game!

### Competitors role

Competitors need to guess what the painter is drawing before the opponents. Each time you succeed in guessing before the others, you receive 1 point. The proposals made to the game are written in chat and viewed by everyone. When the word is guessed, each player will see a banner with the notification of the round winner.

### How to run

- No dependencies required
- Run `nodemon signaling`
- Go to `localhost:9000` 

### Contributors

- Mario Sessa (@kode-git)
