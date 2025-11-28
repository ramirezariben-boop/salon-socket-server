// =============================
//  SERVIDOR SOCKET.IO PARA RENDER
// =============================
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

// -----------------------------
// APP EXPRESS
// -----------------------------
const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// -----------------------------
// ESTADO GLOBAL DE BANCAS
// seatId -> { occupied, by, name }
// -----------------------------
const occupancy = {};

function getState() {
  return { occupancy };
}

// -----------------------------
// SOCKET.IO
// -----------------------------
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  // Enviar estado al nuevo cliente
  socket.emit("state", getState());

  // =============================
  // REQUEST SEAT
  // =============================
  socket.on("request_seat", ({ seatId, name }) => {
    if (occupancy[seatId]?.occupied && occupancy[seatId].by !== socket.id) {
      socket.emit("seat_denied", { seatId });
      return;
    }

    occupancy[seatId] = {
      occupied: true,
      by: socket.id,
      name
    };

    socket.emit("seat_granted", { seatId, name });

    socket.broadcast.emit("seat_update", {
      seatId,
      occupied: true,
      by: socket.id,
      name
    });
  });

  // =============================
  // LIBERAR ASIENTO
  // =============================
  socket.on("release_seat", ({ seatId }) => {
    if (occupancy[seatId] && occupancy[seatId].by === socket.id) {
      delete occupancy[seatId];

      io.emit("seat_update", {
        seatId,
        occupied: false,
        by: null,
        name: null
      });
    }
  });

  // =============================
  // DESCONEXIÓN
  // =============================
  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);

    for (const seatId of Object.keys(occupancy)) {
      if (occupancy[seatId].by === socket.id) {
        delete occupancy[seatId];
        io.emit("seat_update", {
          seatId,
          occupied: false,
          by: null,
          name: null
        });
      }
    }
  });
});

// -----------------------------
// SERVER PORT
// -----------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor Socket.IO escuchando en puerto", PORT);
});
