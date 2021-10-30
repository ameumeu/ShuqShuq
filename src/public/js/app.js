const socket = io();

//const myFace = document.getElementById("myFace");
const cameraBtn = document.getElementById("camera");
const call = document.getElementById("call");
const waiting = document.getElementById("waiting");

call.hidden = true;
waiting.hidden = true;

let myStream;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

async function getMedia() {
  try {
    myStream = await navigator.mediaDevices.getDisplayMedia();
    //    myFace.srcObject = myStream;
  } catch (e) {
    console.log(e);
  }
}

function handleCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "Turn Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Turn On";
    cameraOff = true;
  }
}

async function handleCameraChange() {
  await getMedia();
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}

cameraBtn.addEventListener("click", handleCameraClick);

// Welcome Form (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  await initCall();
  const input = welcomeForm.querySelector("input");
  roomName = input.value;
  input.value = "";
  const h3 = call.querySelector("h3");
  h3.innerText = `Room ${roomName}`;
  socket.emit("room", roomName, socket.id);
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code

socket.on("accept", () => {
  console.log("accepted");
  console.log(myStream);
  waiting.hidden = true;
  call.hidden = false;
  socket.emit("join_room", roomName, socket.id);
});

socket.on("add_q", () => {
  console.log("added on queue");
  welcome.hidden = true;
  call.hidden = true;
  waiting.hidden = false;
});

socket.on("welcome", async () => {
  // myDataChannel = myPeerConnection.createDataChannel("chat");
  // myDataChannel.addEventListener("message", (event) => console.log(event.data));
  // console.log("made data channel");
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("sent the offer");
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
  // myPeerConnection.addEventListener("datachannel", (event) => {
  //   myDataChannel = event.channel;
  //   myDataChannel.addEventListener("message", (event) =>
  //     console.log(event.data)
  //   );
  // });
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});

socket.on("answer", (answer) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
});

socket.on("change", () => {
  socket.emit("change_to", roomName);
});

// RTC Code

function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
  console.log("peers:", data.stream);
  console.log(myStream);
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.stream;
}
