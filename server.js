import express from "express";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ============================
// ESTADO GLOBAL DEL SALÓN
// ============================
const SEAT_IDS = [
  "A1","A2","A3","A4","A5","A6",
  "B1","B2","B3","B4","B5","B6",
  "C1","C2","C3","C4","C5","C6",
  "D1","D2","D3","D4"
];

let occupancy = {}; 
SEAT_IDS.forEach(id => occupancy[id] = { occupied: false, by: null });

// ============================
// SOCKET.IO
// ============================
io.on("connection", (socket) => {

  console.log("Cliente conectado:", socket.id);

  // enviar estado inicial
  socket.emit("state", { occupancy });

  // solicitar asiento
  socket.on("request_seat", ({ seatId }) => {
    if (!SEAT_IDS.includes(seatId)) return;

    if (!occupancy[seatId].occupied) {
      occupancy[seatId] = { occupied: true, by: socket.id };
      socket.emit("seat_granted", { seatId });
      io.emit("seat_update", { seatId, ...occupancy[seatId] });
    } else {
      socket.emit("seat_denied", { seatId });
    }
  });

  // liberar asiento manual
  socket.on("release_seat", ({ seatId }) => {
    if (occupancy[seatId].by === socket.id) {
      occupancy[seatId] = { occupied: false, by: null };
      io.emit("seat_update", { seatId, ...occupancy[seatId] });
    }
  });

  // liberar asiento al desconectarse
  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);

    for (const seatId in occupancy) {
      if (occupancy[seatId].by === socket.id) {
        occupancy[seatId] = { occupied: false, by: null };
        io.emit("seat_update", { seatId, ...occupancy[seatId] });
      }
    }
  });
});

app.get("/", (req, res) => {
  res.send("Servidor Salon Virtual funcionando.");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor escuchando en puerto", PORT);
});
