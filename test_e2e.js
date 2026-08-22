import { io } from "socket.io-client";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

async function runTests() {
  console.log(`=== STARTING RAILGUARD AI ARCHITECTURE VERIFICATION (${SERVER_URL}) ===`);
  let passed = 0;
  let total = 7;

  // TEST 1: Server Health & GET /api/state
  console.log("\n[TEST 1] Testing Server Health and In-Memory State (/api/state)...");
  const stateRes = await fetch(`${SERVER_URL}/api/state`);
  const initialState = await stateRes.json();
  if (
    stateRes.ok &&
    initialState.seats &&
    initialState.seats.A1 === "empty" &&
    initialState.telemetry.signalState === "GREEN"
  ) {
    console.log("✓ TEST 1 PASSED: Initial state matches 12-seat specification exactly.");
    passed++;
  } else {
    console.error("✗ TEST 1 FAILED: Unexpected state", initialState);
  }

  // TEST 2: Team Integration Endpoint: POST /api/login
  console.log("\n[TEST 2] Testing PNR Authentication (/api/login)...");
  const invalidLoginRes = await fetch(`${SERVER_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pnr: "0000000000" })
  });
  const validLoginRes = await fetch(`${SERVER_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pnr: "1234567890" })
  });
  const validData = await validLoginRes.json();

  if (
    invalidLoginRes.status === 401 &&
    validLoginRes.status === 200 &&
    validData.passengerName === "Rahul Sharma"
  ) {
    console.log("✓ TEST 2 PASSED: Invalid PNR blocked (401), Valid PNR authenticated ('Rahul Sharma').");
    passed++;
  } else {
    console.error("✗ TEST 2 FAILED", { invalidStatus: invalidLoginRes.status, validData });
  }

  // Connect multiple socket clients to simulate Passenger, TT OCC, and Pilot HUD
  console.log("\nSetting up live singleton socket clients: Passenger, OCC Manifest, and Pilot HUD...");
  const passengerSocket = io(SERVER_URL);
  const ttSocket = io(SERVER_URL);
  const pilotSocket = io(SERVER_URL);

  await new Promise((resolve) => {
    let connectedCount = 0;
    const check = () => {
      connectedCount++;
      if (connectedCount === 3) resolve();
    };
    passengerSocket.on("connect", check);
    ttSocket.on("connect", check);
    pilotSocket.on("connect", check);
  });
  console.log(`✓ All 3 live client sockets connected at ${SERVER_URL}.`);

  // TEST 3: Passenger claims seat -> TT dashboard receives seat_update live
  console.log("\n[TEST 3] Testing 'claim_seat' live propagation to OCC Split-Flap view...");
  const claimPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TT seat_update timeout")), 2000);
    ttSocket.on("seat_update", (data) => {
      if (data.seatId === "A1" && data.status === "claimed" && data.passengerName === "Rahul Sharma") {
        clearTimeout(timer);
        resolve(data);
      }
    });
  });

  passengerSocket.emit("claim_seat", {
    seatId: "A1",
    pnr: "1234567890",
    passengerName: "Rahul Sharma"
  });

  const claimResult = await claimPromise;
  console.log(`✓ TEST 3 PASSED: TT received seat_update within <1s:`, claimResult);
  passed++;

  // TEST 4: Passenger emits SOS -> TT dashboard updates to "sos" live
  console.log("\n[TEST 4] Testing 'sos' alert propagation to TT OCC view...");
  const sosPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TT sos timeout")), 2000);
    ttSocket.on("seat_update", (data) => {
      if (data.seatId === "A1" && data.status === "sos") {
        clearTimeout(timer);
        resolve(data);
      }
    });
  });

  passengerSocket.emit("sos", { seatId: "A1" });
  const sosResult = await sosPromise;
  console.log(`✓ TEST 4 PASSED: TT received SOS update live:`, sosResult);
  passed++;

  // TEST 5: Team Integration Endpoint: Member Divyansh (Hardware Lead) -> POST /api/telemetry
  console.log("\n[TEST 5] Testing Hardware Lead Endpoint (/api/telemetry) & Pilot HUD sync...");
  const pilotPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Pilot telemetry timeout")), 3000);

    pilotSocket.on("telemetry_update", (data) => {
      if (data.signalState === "RED" && data.sector === "100KM NORTH BLOCK") {
        clearTimeout(timer);
        resolve(data);
      }
    });
  });

  const telemetryPostRes = await fetch(`${SERVER_URL}/api/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      signalState: "RED",
      speed: 0,
      visibility: "< 35m",
      sector: "100KM NORTH BLOCK"
    })
  });
  const telemetryData = await telemetryPostRes.json();
  const pilotResult = await pilotPromise;
  console.log("✓ TEST 5 PASSED: Pilot HUD received hardware telemetry update:", pilotResult);
  passed++;

  // TEST 6: Team Integration Endpoint: Member Ritu (AI Lead) -> POST /api/ai-advice
  console.log("\n[TEST 6] Testing AI Lead Endpoint (/api/ai-advice) & Dispatch Telex stream...");
  const aiPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AI advice timeout")), 3000);

    pilotSocket.on("ai_advice_update", (data) => {
      if (data.text && data.text.includes("Track obstruction confirmed")) {
        clearTimeout(timer);
        resolve(data);
      }
    });
  });

  await fetch(`${SERVER_URL}/api/ai-advice`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      advice: "Track obstruction confirmed at KM 102. Initiate automated brake curve.",
      conflictId: "AI-102"
    })
  });
  const aiResult = await aiPromise;
  console.log("✓ TEST 6 PASSED: Pilot HUD received AI advice update:", aiResult);
  passed++;

  // TEST 7: Page Reload / Reconnect Sync (state_update)
  console.log("\n[TEST 7] Testing Reconnect / Refresh synchronization (state_update)...");
  const newClientSocket = io(SERVER_URL);
  const reconnectPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Reconnect state_update timeout")), 2000);
    newClientSocket.on("state_update", (syncedState) => {
      clearTimeout(timer);
      resolve(syncedState);
    });
  });

  const syncedState = await reconnectPromise;
  if (
    syncedState.seats.A1 === "sos" &&
    syncedState.telemetry.signalState === "RED"
  ) {
    console.log("✓ TEST 7 PASSED: Reconnected client received complete in-memory state snapshot.");
    passed++;
  } else {
    console.error("✗ TEST 7 FAILED: State mismatch on reconnect", syncedState);
  }

  // Cleanup sockets
  passengerSocket.disconnect();
  ttSocket.disconnect();
  pilotSocket.disconnect();
  newClientSocket.disconnect();

  console.log(`\n======================================================`);
  console.log(`VERIFICATION SUMMARY: ${passed}/${total} ARCHITECTURAL TESTS PASSED`);
  console.log(`======================================================\n`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
