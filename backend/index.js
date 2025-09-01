import express from "express";
import http from "http";
import { Server } from "socket.io";
import axios from "axios";

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

const rooms = new Map();

const languageExtensions = {
  python: "py",
  javascript: "js",
  java: "java",
  c: "c",
  cpp: "cpp",
  go: "go",
  ruby: "rb",
  php: "php",
  rust: "rs",
};

io.on("connection", (socket) => {
  let currentRoom = null;
  let currentUser = null;

  socket.on("join", ({ roomId, userName }) => {
    currentRoom = roomId;
    currentUser = userName;

    socket.join(roomId);
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(userName);

    io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId)));
  });

  socket.on("codeChange", ({ roomId, code }) => {
    socket.to(roomId).emit("codeUpdate", code);
  });

  socket.on("languageChange", ({ roomId, language }) => {
    io.to(roomId).emit("languageUpdate", language);
  });

  socket.on("typing", ({ roomId, userName }) => {
    socket.to(roomId).emit("userTyping", userName);
  });

  socket.on("compileCode", async ({ code, roomId, language }) => {
    try {
      const fileExtension = languageExtensions[language] || "txt";

      const response = await axios.post(
        "https://emkc.org/api/v2/piston/execute",
        {
          language,
          version: "*", 
          files: [
            {
              name: `main.${fileExtension}`,
              content: code,
            },
          ],
        }
      );

      io.to(roomId).emit("codeResponse", response.data.run);
    } catch (err) {
      io.to(roomId).emit("codeResponse", {
        stdout: "",
        stderr: err.response?.data || err.message,
      });
    }
  });

  socket.on("leaveRoom", () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom).delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
      socket.leave(currentRoom);
    }
    currentRoom = null;
    currentUser = null;
  });

  socket.on("disconnect", () => {
    if (currentRoom && currentUser) {
      rooms.get(currentRoom).delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(rooms.get(currentRoom)));
    }
  });
});

server.listen(5000, () => console.log("✅ Server running on port 5000"));
