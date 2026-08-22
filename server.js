import express from "express";
import http from "http";
import { randomUUID } from "crypto";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

const allowedOrigins = new Set(
  (process.env.CLIENT_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin is not allowed."));
  },
  methods: ["GET", "POST"]
};

app.use(cors(corsOptions));
app.use(express.json());

const io = new Server(server, {
  cors: corsOptions
});

// =========================================================================
// IN-MEMORY STATE SCHEMA (Hard Architecture Rule #2 - Port 5000)
// =========================================================================
const state = {
  freightTrains: {
    F99: {
      recorded_context: {
        client: "Apollo Pharma",
        max_acceptable_delay_mins: 20
      }
    }
  },
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
  passenger_context: {
    A1: { gender: "M", age: 25, quota: "GN", berth: "Upper" },
    A2: { gender: "F", age: 68, quota: "SS", berth: "Lower" },
    A3: { gender: "F", age: 24, quota: "LD", berth: "Middle" }
  },
  trains: {
    "F99": {
      type: "Freight",
      status: "Moving",
      recorded_context: {
        client: "Apollo Pharma",
        max_acceptable_delay_mins: 20,
        penalty_per_min: 5000
      }
    }
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

function buildDemoFreightResolution(trainId, maxDelay) {
  return {
    resolution: `AI Routing Alternative: Divert ${trainId} via Loop Line 4 (Mathura Bypass). Estimated added transit: 12 min. SLA preserved within ${maxDelay} min window. No penalty incurred. Route approved by Freight Corridor OCC.`,
    suggested_route: {
      via: "Loop Line 4 — Mathura Bypass",
      added_transit_mins: 12,
      sla_preserved: true,
      penalty_incurred: 0
    },
    source: "demo-fallback"
  };
}

async function requestFreightAiResolution({ trainId, context, maxDelay }) {
  const apiKey = process.env.GEMINI_API_KEY;

  // Keep the demo functional until a server-side Gemini key is configured.
  if (!apiKey) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return buildDemoFreightResolution(trainId, maxDelay);
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.7-flash";
  const prompt = [
    "You are a railway freight OCC routing advisor.",
    `Train: ${trainId}`,
    `Client: ${context.client}`,
    `Maximum acceptable delay: ${maxDelay} minutes.`,
    "Provide a concise, operationally safe alternative route that preserves the SLA."
  ].join("\n");

  // Deliberately no AbortSignal timeout: the OCC remains pending until Gemini replies or fails.
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Gemini request failed with HTTP ${response.status}`);
  }

  const resolution = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!resolution) {
    throw new Error("Gemini returned no usable resolution.");
  }

  return {
    resolution,
    suggested_route: null,
    source: "gemini"
  };
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

    if (state.seats[seatId] !== "empty") {
      socket.emit("error", { message: "Seat already claimed by another transaction." });
      return;
    }

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

  // Client -> Server: request_seat_swap { initiatorSeat, targetSeat }
  socket.on("request_seat_swap", (data) => {
    const { initiatorSeat, targetSeat } = data || {};
    const initiator_context = state.passenger_context[initiatorSeat];
    const target_context = state.passenger_context[targetSeat];

    if (!initiator_context || !target_context) return;

    const exposed_state = { initiator_context, target_context };

    if (target_context.quota === "LD" && initiator_context.gender === "M") {
      socket.emit("swap_mismatch_warning", {
        status: "Rejected",
        reason: "Ladies Quota protection: a male passenger cannot request a Ladies Quota berth.",
        exposed_state
      });
      return;
    }

    if (
      target_context.quota === "SS"
      && target_context.berth === "Lower"
      && initiator_context.age < 60
    ) {
      socket.emit("swap_mismatch_warning", {
        status: "Rejected",
        reason: "Senior Citizen Protection: a lower berth under Senior Citizen quota cannot be reassigned to a passenger under 60.",
        exposed_state
      });
    }
  });

  // =========================================================================
  // FREIGHT SLA ARBITRATOR — Challenge #697
  // Client -> Server: issue_operator_command { trainId, durationMins }
  // =========================================================================
  socket.on("issue_operator_command", (data) => {
    const payload = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    const { trainId, durationMins } = payload;
    const requestId = typeof payload.requestId === "string" && payload.requestId.length <= 128
      ? payload.requestId
      : randomUUID();

    if (typeof trainId !== "string" || !Object.hasOwn(state.trains, trainId)) {
      socket.emit("negotiation_mismatch_warning", {
        error: `Train ${trainId || "unknown"} not found in state.`,
        requestId
      });
      return;
    }

    if (!Number.isInteger(durationMins) || durationMins < 0 || durationMins > 60) {
      socket.emit("negotiation_mismatch_warning", {
        error: "durationMins must be an integer between 0 and 60.",
        requestId
      });
      return;
    }

    const train = state.trains[trainId];
    const ctx = train.recorded_context;
    const maxDelay = ctx.max_acceptable_delay_mins;

    if (durationMins > maxDelay) {
      const excessMins = durationMins - maxDelay;
      const penalty = excessMins * ctx.penalty_per_min;

      const exposed_state = {
        operator_action: {
          trainId,
          requested_delay_mins: durationMins,
          timestamp: getFormattedTime(),
        },
        recorded_context: ctx,
        arbitration_result: {
          verdict: "BLOCKED",
          max_allowed_delay_mins: maxDelay,
          excess_mins: excessMins,
          calculated_penalty_inr: penalty,
          penalty_formatted: `₹${penalty.toLocaleString("en-IN")}`,
        },
      };

      socket.emit("negotiation_mismatch_warning", {
        warning: `SLA BREACH: Requested ${durationMins} min delay exceeds ${ctx.client}'s max ${maxDelay} min threshold by ${excessMins} min. Penalty: ₹${penalty.toLocaleString("en-IN")}.`,
        exposed_state,
        requestId
      });

      socket.emit("ai_resolution_pending", { requestId });

      // Do not await here: the Gemini network request yields immediately, leaving all socket handlers responsive.
      void requestFreightAiResolution({ trainId, context: ctx, maxDelay })
        .then((aiResolution) => {
          if (socket.connected) {
            socket.emit("ai_resolution_ready", { ...aiResolution, requestId });
          }
        })
        .catch((error) => {
          console.error("Freight AI resolution failed:", error);
          if (socket.connected) {
            socket.emit("ai_resolution_error", {
              requestId,
              message: "The AI resolution service did not return a usable answer. Please retry the request."
            });
          }
        });
    } else {
      socket.emit("negotiation_mismatch_warning", {
        warning: null,
        requestId,
        exposed_state: {
          operator_action: {
            trainId,
            requested_delay_mins: durationMins,
            timestamp: getFormattedTime(),
          },
          recorded_context: ctx,
          arbitration_result: {
            verdict: "APPROVED",
            max_allowed_delay_mins: maxDelay,
            excess_mins: 0,
            calculated_penalty_inr: 0,
          },
        },
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`Socket disconnected: ${socket.id} (${reason})`);
    socket.removeAllListeners();
  });
});

// macOS Control Center commonly reserves port 5000, so the local API defaults to 3001.
const PORT = Number(process.env.PORT) || 3001;
const FALLBACK_PORT = 3002;
let fallbackAttempted = false;

server.on("error", (err) => {
  if (err.code === "EADDRINUSE" && !fallbackAttempted && PORT !== FALLBACK_PORT) {
    fallbackAttempted = true;
    console.error(`⚠️ Port ${PORT} is already in use. Trying fallback port ${FALLBACK_PORT}.`);
    server.listen(FALLBACK_PORT, () => {
      console.log(`RailGuard AI Server running on http://localhost:${FALLBACK_PORT}`);
    });
  } else {
    console.error("Server error:", err);
  }
});

server.listen(PORT, () => {
  console.log(`RailGuard AI Server running on http://localhost:${PORT}`);
});
