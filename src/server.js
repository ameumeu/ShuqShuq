import http from "http";
//import SocketIO from "socket.io";
import { Server } from "socket.io";
import express from "express";
import { instrument } from "@socket.io/admin-ui";

const app = express();
const q = new Map();
const u = new Map();

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
      q.get(roomName).push(id);
      socket.emit("add_q");
    } else {
      socket.emit("accept");
    }
  });
  socket.on("join_room", (roomName, id) => {
    socket.join(roomName);
    u.set(id, roomName);
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
    const roomName = u.get(socket.id);
    delete u[socket.id];
    if (q.get(roomName)) {
      socket.to(q.get(roomName).shift()).emit("accept");
    }
  });
});

const handleListen = () => console.log(`Listening on https://localhost:3000`);
httpServer.listen(3000, handleListen);
