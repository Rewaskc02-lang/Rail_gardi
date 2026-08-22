import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// =========================================================================
// IN-MEMORY STATE SCHEMA (Hard Architecture Rule #2 - Port 5000)
// =========================================================================
const state = {
  seats: {
    A1: "empty",
    A2: "empty",
    A3: "claimed",
    A4: "sos",
    B1: "empty",
    B2: "empty",
    B3: "empty",
    B4: "empty",
    C1: "empty",
    C2: "empty",
    C3: "empty",
    C4: "empty"
  },
  seatMeta: {
    A3: { passengerName: "Vikram Malhotra", pnr: "1234567890", foodOrder: null },
    A4: { passengerName: "Ananya Roy", pnr: "12345", foodOrder: null }
  },
  telemetry: {
    speed: 78,
    visibility: "< 45m",
    signalState: "GREEN",
    signal: "GREEN",
    sector: "100KM NORTH BLOCK",
    zone: "Fog Zone 3 - Northern Corridor",
    timestamp: "12:00:00"
  },
  aiAdvice: "Track sector clear. Normal line speed authorized. Maintain 433MHz LoRa link."
};

// Hardcoded PNR Database for Instant Demo Validation
const PNR_DATABASE = {
  "1234567890": "Rahul Sharma",
  "12345": "Priya Patel",
  "9876543210": "Amitabh Sen"
};

// Helper for formatting timestamps
function getFormattedTime() {
  const now = new Date();
  return now.toTimeString().split(" ")[0];
}

// =========================================================================
// REST ENDPOINTS (Team Integration Decoupling)
// =========================================================================

// POST /login & /api/login — PNR verification
function handleLogin(req, res) {
  const { pnr } = req.body;
  if (!pnr || !PNR_DATABASE[pnr]) {
    return res.status(401).json({ ok: false, error: "Invalid PNR. Please verify ticket." });
  }
  return res.json({ ok: true, passengerName: PNR_DATABASE[pnr] });
}
app.post("/login", handleLogin);
app.post("/api/login", handleLogin);

// POST /api/telemetry & /telemetry (Member Divyansh - Hardware Lead / ESP32 LoRa Serial)
function handleTelemetry(req, res) {
  const { speed, visibility, signalState, signal, sector, zone, timestamp } = req.body;

  const currentSignal = signalState || signal || state.telemetry.signalState;

  state.telemetry = {
    speed: speed !== undefined ? speed : (currentSignal === "RED" ? 0 : 78),
    visibility: visibility || state.telemetry.visibility,
    signalState: currentSignal,
    signal: currentSignal,
    sector: sector || state.telemetry.sector,
    zone: zone || sector || state.telemetry.zone,
    timestamp: timestamp || getFormattedTime()
  };

  // Broadcast hardware/telemetry change to all clients over WebSocket
  io.emit("telemetry_update", state.telemetry);

  // Auto-generate AI triage guidance when signal flips to RED if not overridden
  if (currentSignal === "RED") {
    state.aiAdvice = `CRITICAL ALERT: Emergency RED aspect in ${state.telemetry.sector}. Initiate 100% pneumatic braking. Reroute via Loop Line 2.`;
    io.emit("ai_advice_update", {
      text: state.aiAdvice,
      advice: state.aiAdvice,
      conflictId: "ALRT-" + Date.now().toString().slice(-4)
    });
  } else if (currentSignal === "GREEN" && state.aiAdvice.includes("CRITICAL ALERT")) {
    state.aiAdvice = "Track sector clear. Normal line speed authorized. Maintain 433MHz LoRa link.";
    io.emit("ai_advice_update", {
      text: state.aiAdvice,
      advice: state.aiAdvice,
      conflictId: null
    });
  }

  return res.json({ ok: true, telemetry: state.telemetry, aiAdvice: state.aiAdvice });
}
app.post("/telemetry", handleTelemetry);
app.post("/api/telemetry", handleTelemetry);

// POST /api/ai-advice & /ai-advice (Member Ritu - AI Lead / Gemini AI Advice Stream)
function handleAiAdvice(req, res) {
  const { advice, text, conflictId } = req.body;
  const newAdvice = advice || text;

  if (!newAdvice) {
    return res.status(400).json({ error: "Missing advice or text payload" });
  }

  state.aiAdvice = newAdvice;

  io.emit("ai_advice_update", {
    text: state.aiAdvice,
    advice: state.aiAdvice,
    conflictId: conflictId || "AI-" + Date.now().toString().slice(-4)
  });

  return res.json({ ok: true, aiAdvice: state.aiAdvice });
}
app.post("/ai-advice", handleAiAdvice);
app.post("/api/ai-advice", handleAiAdvice);

// GET /state & /api/state — Current state snapshot
function handleGetState(req, res) {
  res.json({
    seats: state.seats,
    seatMeta: state.seatMeta,
    telemetry: state.telemetry,
    aiAdvice: state.aiAdvice
  });
}
app.get("/state", handleGetState);
app.get("/api/state", handleGetState);

// =========================================================================
// WEBSOCKET SUBSCRIBERS (Sub-15ms Live Telemetry Relay)
// =========================================================================
io.on("connection", (socket) => {
  // Broadcast full state on connect (ensures instant sync without blank screens)
  socket.emit("state_update", {
    seats: state.seats,
    seatMeta: state.seatMeta,
    telemetry: state.telemetry,
    aiAdvice: { text: state.aiAdvice, advice: state.aiAdvice }
  });

  // Client -> Server: claim_seat { seatId, pnr, passengerName }
  socket.on("claim_seat", (data) => {
    const { seatId, pnr, passengerName } = data || {};
    if (!seatId || !Object.hasOwn(state.seats, seatId)) return;

    state.seats[seatId] = "claimed";
    state.seatMeta[seatId] = {
      pnr: pnr || null,
      passengerName: passengerName || "Passenger",
      foodOrder: state.seatMeta[seatId]?.foodOrder || null
    };

    io.emit("seat_update", {
      seatId,
      status: "claimed",
      passengerName: state.seatMeta[seatId].passengerName,
      pnr: state.seatMeta[seatId].pnr
    });
  });

  // Client -> Server: sos { seatId }
  socket.on("sos", (data) => {
    const { seatId } = data || {};
    if (!seatId || !Object.hasOwn(state.seats, seatId)) return;

    state.seats[seatId] = "sos";

    io.emit("seat_update", {
      seatId,
      status: "sos",
      passengerName: state.seatMeta[seatId]?.passengerName || "Occupant"
    });
  });

  // Client -> Server: food_order { seatId, items }
  socket.on("food_order", (data) => {
    const { seatId, items } = data || {};
    if (!seatId || !Object.hasOwn(state.seats, seatId)) return;

    if (!state.seatMeta[seatId]) {
      state.seatMeta[seatId] = { passengerName: "Passenger", pnr: null, foodOrder: null };
    }
    state.seatMeta[seatId].foodOrder = items;

    io.emit("seat_update", {
      seatId,
      status: state.seats[seatId] || "claimed",
      passengerName: state.seatMeta[seatId].passengerName,
      foodOrder: items
    });
  });
});

const PORT = process.env.PORT || 5000;

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`⚠️ Port ${PORT} is already in use by another instance or process.`);
    console.error(`To kill the existing process, run: lsof -ti:${PORT} | xargs kill -9`);
    process.exit(1);
  } else {
    console.error("Server error:", err);
  }
});

server.listen(PORT, () => {
  console.log(`RailGuard AI Server running on http://localhost:${PORT}`);
});
