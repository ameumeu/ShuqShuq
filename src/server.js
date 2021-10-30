import http from "http";
//import SocketIO from "socket.io";
import { Server } from "socket.io";
import express from "express";
import { instrument } from "@socket.io/admin-ui";

const app = express();
const q = new Map();
const u = new Map();
const q_u = new Map();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});
instrument(wsServer, {
  auth: false,
});

wsServer.on("connection", (socket) => {
  socket.on("room", (roomName, id) => {
    if (wsServer.sockets.adapter.rooms.get(roomName)?.size > 1) {
      if (!q.get(roomName)) {
        q.set(roomName, []);
      }
      q_u.set(id, roomName);
      q.get(roomName).push(id);
      socket.emit("add_q");
    } else {
      socket.emit("accept");
    }
  });
  socket.on("join_room", (roomName, id) => {
    socket.join(roomName);
    u.set(id, roomName);
    if (q_u.get(id)) {
      delete q_u[id];
    }
    socket.to(roomName).emit("welcome");
  });
  socket.on("offer", (offer, roomName) => {
    socket.to(roomName).emit("offer", offer);
  });
  socket.on("answer", (answer, roomName) => {
    socket.to(roomName).emit("answer", answer);
  });
  socket.on("ice", (ice, roomName) => {
    socket.to(roomName).emit("ice", ice);
  });
  socket.on("disconnect", () => {
    const roomName_u = u.get(socket.id);
    const roomName_q_u = q_u.get(socket.id);
    if (roomName_u) {
      delete u[socket.id];
      if (q.get(roomName_u)) {
        socket.to(q.get(roomName_u).shift())?.emit("accept");
      }
    } else if (roomName_q_u) {
      const index = q.get(roomName_q_u).indexOf(socket.id);
      q.get(roomName_q_u).splice(index, 1);
      delete q_u[socket.id];
    }
  });
});

const handleListen = () => console.log(`Listening on https://localhost:3000`);
httpServer.listen(3000, handleListen);
