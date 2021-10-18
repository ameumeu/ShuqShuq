const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("#enter");
const room = document.getElementById("room");
const nameForm = welcome.querySelector("#name");
const screen = document.getElementById("screen");
const getScreenButton = document.getElementById("getScreen");

let myStream;
let myPeerConnection;
let roomName;

async function getMedia() {
  try {
    myStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    console.log(myStream);
  } catch (e) {
    console.log(e);
  }
}

form.hidden = true;
room.hidden = true;

function addMessage(message) {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}

function handleMessageSubmit(event) {
  event.preventDefault();
  const input = room.querySelector("#msg input");
  const value = input.value;
  socket.emit("new_message", input.value, roomName, () => {
    addMessage(`You: ${value}`);
  });
  input.value = "";
}

function handleNicknameSubmit(event) {
  event.preventDefault();
  const input = welcome.querySelector("#name input");
  socket.emit("nickname", input.value);
  form.hidden = false;
  nameForm.hidden = true;
}

function showRoom(newCount) {
  welcome.hidden = true;
  room.hidden = false;
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
  const msgForm = room.querySelector("#msg");
  msgForm.addEventListener("submit", handleMessageSubmit);
}

function handleRoomSubmit(event) {
  event.preventDefault();
  const input = form.querySelector("input");
  socket.emit("enter_room", input.value, showRoom);
  roomName = input.value;
  input.value = "";
  //  getMedia();
}

async function handleGetScreenClick(event) {
  event.preventDefault();
  if (screen.srcObject) {
    screen.srcObject = null;
    getScreenButton.innerText = "Start Sharing";
  } else {
    connectScreen();
    await getMedia();
    screen.srcObject = myStream;
    getScreenButton.innerText = "Stop Sharing";
    console.log("sent the offer");
  }
}

form.addEventListener("submit", handleRoomSubmit);
nameForm.addEventListener("submit", handleNicknameSubmit);
getScreenButton.addEventListener("click", handleGetScreenClick);

socket.on("welcome", (user, newCount) => {
  addMessage(`${user} arrived!`);
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
});

socket.on("bye", (left, newCount) => {
  addMessage(`${left} left ㅠ!`);
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
});

socket.on("new_message", addMessage);

socket.on("room_change", (rooms) => {
  const roomList = welcome.querySelector("ul");
  roomList.innerText = "";
  if (rooms.length === 0) {
    return;
  }
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.innerText = room;
    roomList.append(li);
  });
});

socket.on("offer", async (offer) => {
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setRemoteDescription(answer);
  socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => {
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("recieved candidate");
  myPeerConnection.addIceCandidate(ice);
});

// RTC Code

function makeConnection() {
  myPeerConnection = new RTCPeerConnection();
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

async function connectScreen() {
  makeConnection();
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
}

function handleIce(data) {
  socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
  console.log("got an event from my peer");
}
