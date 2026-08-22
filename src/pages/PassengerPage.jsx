import React, { useState, useEffect, useRef } from "react";
import socket from "../socket.js";

const CATERING_MENU = [
  { id: "item-1", name: "Executive Veg Thali", category: "Full Meal", price: "$8" },
  { id: "item-2", name: "Masala Chai & Samosa Combo", category: "Hot Snacks", price: "$4" },
  { id: "item-3", name: "Paneer Grilled Sandwich", category: "Snacks", price: "$5" }
];

const DEMO_PNR_CONTEXT = [
  { pnr: "1111111111", details: "S1-Upper (25M, General)" },
  { pnr: "2222222222", details: "S1-Lower (68F, Senior)" },
  { pnr: "3333333333", details: "S2-Lower (28F, Pregnant)" },
  { pnr: "4444444444", details: "S2-Middle (45M, Patient)" },
  { pnr: "5555555555", details: "S1-Middle (31F, Standard)" },
  { pnr: "6666666666", details: "S1-Side Upper (34M, Standard)" },
  { pnr: "7777777777", details: "S2-Upper (39F, Standard)" },
  { pnr: "8888888888", details: "S2-Side Lower (52M, Standard)" },
  { pnr: "9999999999", details: "B1-Lower (42F, Standard)" },
  { pnr: "1010101010", details: "B1-Middle (29M, Standard)" },
  { pnr: "1212121212", details: "B1-Upper (36F, Standard)" },
  { pnr: "1313131313", details: "B1-Side Lower (47M, Standard)" }
];

const COACH_SEAT_OPTIONS = {
  S1: ["A1", "A2", "A3", "A4"],
  S2: ["B1", "B2", "B3", "B4"],
  B1: ["C1", "C2", "C3", "C4"]
};

export default function PassengerPage() {
  const [pnrInput, setPnrInput] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passengerName, setPassengerName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [selectedSeat, setSelectedSeat] = useState("A1");
  const [assignedSeat, setAssignedSeat] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [seatsState, setSeatsState] = useState({
    A1: "empty", A2: "empty", A3: "claimed", A4: "sos",
    B1: "empty", B2: "empty", B3: "empty", B4: "empty",
    C1: "empty", C2: "empty", C3: "empty", C4: "empty"
  });
  const [sosConfirmOpen, setSosConfirmOpen] = useState(false);
  const [swapWarning, setSwapWarning] = useState(null);
  const [swapCoach, setSwapCoach] = useState("S1");
  const [swapSeat, setSwapSeat] = useState("A2");
  const [incomingSwapRequest, setIncomingSwapRequest] = useState(null);
  const [copiedPnr, setCopiedPnr] = useState("");

  const receiptModalRef = useRef(null);

  useEffect(() => {
    function handleStateUpdate(fullState) {
      if (fullState && fullState.seats) {
        setSeatsState(fullState.seats);
      }
    }

    function handleSeatUpdate(update) {
      if (!update || !update.seatId) return;
      setSeatsState((prev) => ({
        ...prev,
        [update.seatId]: update.status
      }));

      if (update.seatId === selectedSeat && update.status === "sos") {
        setSosConfirmOpen(false);
      }
    }

    function handleSwapMismatchWarning(warning) {
      if (warning?.status === "Rejected") {
        setSwapWarning(warning);
      }
    }

    function handleIncomingSwapRequest(request) {
      if (request?.initiatorCoach && request?.initiatorSeat) {
        setIncomingSwapRequest(request);
      }
    }

    socket.on("state_update", handleStateUpdate);
    socket.on("seat_update", handleSeatUpdate);
    socket.on("swap_mismatch_warning", handleSwapMismatchWarning);
    socket.on("swap_request_received", handleIncomingSwapRequest);

    return () => {
      socket.off("state_update", handleStateUpdate);
      socket.off("seat_update", handleSeatUpdate);
      socket.off("swap_mismatch_warning", handleSwapMismatchWarning);
      socket.off("swap_request_received", handleIncomingSwapRequest);
    };
  }, [selectedSeat]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");

    try {
      const data = await new Promise((resolve, reject) => {
        socket.timeout(5000).emit("login_pnr", { pnr: pnrInput.trim() }, (err, response) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(response);
        });
      });

      if (data?.ok) {
        setIsLoggedIn(true);
        setPassengerName(data.passengerName);
        setAssignedSeat(data.assignment);
        setSelectedSeat(data.assignment.seat);
        setLoginError("");
      } else {
        setLoginError(data?.error || "Invalid PNR. Please check ticket details.");
      }
    } catch {
      setLoginError("Unable to verify PNR over the secure railway connection. Please retry.");
    }
  }

  function handleClaimSeat() {
    socket.emit("claim_seat", {
      seatId: selectedSeat,
      pnr: pnrInput.trim() || "1234567890",
      passengerName: passengerName || "Rahul Sharma"
    });
  }

  function handleExecuteSOS() {
    socket.emit("sos", {
      seatId: selectedSeat
    });
  }

  function handleCrossCoachSwapRequest() {
    socket.emit("request_cross_coach_swap", {
      initiatorPnr: pnrInput.trim(),
      targetCoach: swapCoach,
      targetSeat: swapSeat
    });
  }

  function handleCrossCoachSwapResponse(accepted) {
    socket.emit("respond_to_cross_coach_swap", {
      swapRequestId: incomingSwapRequest?.swapRequestId,
      accepted
    });
    setIncomingSwapRequest(null);
  }

  async function copyDemoPnr(pnr) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pnr);
      } else {
        const copyField = document.createElement("textarea");
        copyField.value = pnr;
        copyField.style.position = "fixed";
        copyField.style.opacity = "0";
        document.body.appendChild(copyField);
        copyField.select();
        document.execCommand("copy");
        copyField.remove();
      }
      setCopiedPnr(pnr);
    } catch {
      setLoginError("PNR could not be copied automatically. Please select it manually.");
    }
  }

  function handleOrderFood(item) {
    socket.emit("food_order", {
      seatId: selectedSeat,
      items: [item.name]
    });

    const newReceipt = {
      orderId: "IRCTC-" + Math.floor(100000 + Math.random() * 900000),
      seatId: selectedSeat,
      item: item.name,
      category: item.category,
      price: item.price,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString('en-GB')
    };

    setReceipt(newReceipt);
    if (receiptModalRef.current) {
      receiptModalRef.current.showModal();
    }
  }

  function closeReceiptModal() {
    if (receiptModalRef.current) {
      receiptModalRef.current.close();
    }
  }

  return (
    <div className="passenger-container">
      {/* Real-time Journey Progress Tracker */}
      <div className="glass-panel" style={{ padding: "20px 24px" }}>
        <div className="journey-badge-header">
          <div>
            <div className="font-heading" style={{ fontSize: "1.2rem", fontWeight: 700 }}>
              12951 RAJDHANI EXP
            </div>
            <div className="font-mono-tech" style={{ fontSize: "0.8rem", color: "var(--glow-mint)" }}>
              NDLS ➔ MMCT • COACH B-2
            </div>
          </div>
          <span className="status-badge-spatial claimed">EN ROUTE</span>
        </div>

        <div style={{ height: "6px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "4px", margin: "16px 0 10px 0", overflow: "hidden", position: "relative" }}>
          <div style={{ width: "52%", height: "100%", background: "linear-gradient(90deg, var(--glow-mint), var(--glow-cyan))", borderRadius: "4px" }} />
        </div>

        <div className="font-mono-tech" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          <span>CURRENT: 42 KM OUT</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>APPROACHING: KANPUR CENTRAL PF 3</span>
        </div>
      </div>

      {!isLoggedIn ? (
        /* PNR Login Card */
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(250px, 0.8fr)", gap: "18px" }}>
        <div className="glass-panel" style={{ padding: "28px" }}>
          <span className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--glow-mint)", letterSpacing: "0.08em" }}>
            🎫 PASSENGER IDENTITY VERIFICATION
          </span>
          <h2 style={{ fontSize: "1.4rem", margin: "8px 0 14px 0" }}>Enter Ticket PNR</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "20px" }}>
            Validate your 10-digit Passenger Name Record to access berth controls and emergency signaling:
          </p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label htmlFor="pnr-input" className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                PNR NUMBER
              </label>
              <input
                id="pnr-input"
                type="text"
                className="form-input-spatial"
                value={pnrInput}
                onChange={(e) => setPnrInput(e.target.value)}
                placeholder="e.g. 1234567890 or 12345"
                autoComplete="off"
              />
            </div>

            <button id="login-btn" type="submit" className="btn-spatial btn-spatial-mint" style={{ width: "100%", padding: "14px" }}>
              VALIDATE PNR & ACCESS COACH
            </button>
          </form>

          {loginError && (
            <div id="login-error" className="font-mono-tech" style={{ marginTop: "14px", padding: "10px", background: "rgba(255, 42, 85, 0.15)", border: "1px solid var(--glow-crimson)", borderRadius: "6px", color: "var(--glow-crimson)", fontSize: "0.8rem" }}>
              ⚠️ {loginError}
            </div>
          )}
        </div>
        <aside className="glass-panel" style={{ padding: "22px", alignSelf: "start", borderTop: "3px solid var(--glow-mint)" }}>
          <h3 className="font-mono-tech" style={{ fontSize: "0.8rem", color: "var(--glow-mint)", letterSpacing: "0.05em" }}>DEMO CONTEXT (JUDGES COPY-PASTE)</h3>
          <p style={{ margin: "8px 0 14px", color: "var(--text-secondary)", fontSize: "0.78rem" }}>Click any PNR to copy it.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {DEMO_PNR_CONTEXT.map((entry) => (
              <button
                key={entry.pnr}
                type="button"
                className="btn-spatial"
                style={{ textAlign: "left", padding: "9px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                onClick={() => copyDemoPnr(entry.pnr)}
                title={`Copy ${entry.pnr}`}
              >
                <span className="font-mono-tech" style={{ display: "block", fontSize: "0.72rem", color: copiedPnr === entry.pnr ? "var(--glow-cyan)" : "var(--glow-mint)" }}>{copiedPnr === entry.pnr ? "✓ COPIED" : entry.pnr}</span>
                <span style={{ display: "block", marginTop: "2px", fontSize: "0.72rem" }}>{entry.details}</span>
              </button>
            ))}
          </div>
        </aside>
        </div>
      ) : (
        /* Logged In Dashboard */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Berth Allocation & Control */}
          <div className="glass-panel" style={{ padding: "24px", borderLeft: "4px solid var(--glow-mint)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="font-mono-tech" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>PASSENGER NAME</span>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>{passengerName}</div>
                <div className="font-mono-tech" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  PNR: {pnrInput || "1234567890"} • CLASS: 3A
                </div>
              </div>
              <span className="status-badge-spatial claimed">VERIFIED</span>
            </div>

            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)" }}>
              <span className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                ASSIGNED BERTH / SEAT NUMBER
              </span>
              <div className="form-input-spatial" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "default" }}>
                <strong>{assignedSeat?.coach} — Berth {assignedSeat?.seat}</strong>
                <span className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--glow-mint)" }}>{assignedSeat?.berth?.toUpperCase()}</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
              <button
                id="claim-seat-btn"
                type="button"
                className="btn-claim-spatial"
                onClick={handleClaimSeat}
              >
                <span>💺 Claim Berth {selectedSeat}</span>
                <span style={{ fontSize: "0.7rem", opacity: 0.75 }}>Notify OCC Controller</span>
              </button>

              <button
                type="button"
                className="btn-spatial btn-spatial-mint"
                style={{ padding: "14px", textAlign: "center" }}
                onClick={() => {
                  const el = document.getElementById("catering-menu-card");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                ☕ Pantry Menu
              </button>
            </div>
          </div>

          {/* Cross-Coach Seat Swap Arbitrator */}
          <div className="glass-panel" style={{ padding: "24px", borderLeft: "4px solid var(--glow-crimson)" }}>
            <span className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--glow-crimson)", letterSpacing: "0.08em" }}>
              ⚖️ CROSS-COACH SEAT SWAP
            </span>
            <p style={{ marginTop: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Request a regulated exchange from your assigned berth in {assignedSeat?.coach}.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", marginTop: "14px" }}>
              <select
                id="cross-coach-swap-coach"
                className="form-input-spatial"
                value={swapCoach}
                onChange={(e) => {
                  setSwapCoach(e.target.value);
                  setSwapSeat(COACH_SEAT_OPTIONS[e.target.value][0]);
                }}
              >
                {Object.keys(COACH_SEAT_OPTIONS).map((coach) => <option key={coach} value={coach}>Coach {coach}</option>)}
              </select>
              <select
                id="cross-coach-swap-seat"
                className="form-input-spatial"
                value={swapSeat}
                onChange={(e) => setSwapSeat(e.target.value)}
              >
                {COACH_SEAT_OPTIONS[swapCoach].map((seat) => <option key={seat} value={seat}>Seat {seat}</option>)}
              </select>
              <button
                id="send-cross-coach-swap-request-btn"
                type="button"
                className="btn-spatial btn-spatial-crimson"
                style={{ whiteSpace: "nowrap" }}
                onClick={handleCrossCoachSwapRequest}
              >
                SEND SWAP REQUEST
              </button>
            </div>
          </div>

          {/* Deliberate Emergency SOS Safety Station */}
          <div className="sos-card-spatial">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="font-mono-tech" style={{ color: "var(--glow-crimson)", fontWeight: 700, fontSize: "0.85rem" }}>
                🚨 EMERGENCY PASSENGER ALARM
              </span>
              <span className="font-mono-tech" style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                SEC-78/B
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Transmits mesh emergency beacon directly to Loco-Pilot HUD and Operator Control Center (OCC).
            </p>

            {!sosConfirmOpen ? (
              <button
                id="sos-btn"
                type="button"
                className="btn-spatial btn-spatial-crimson"
                style={{ width: "100%", padding: "14px" }}
                onClick={() => setSosConfirmOpen(true)}
              >
                {seatsState[selectedSeat] === "sos" ? "⚠️ SOS TRANSMITTED (ACTIVE)" : "TRIGGER SOS EMERGENCY ALARM"}
              </button>
            ) : (
              <div style={{ background: "rgba(0, 0, 0, 0.6)", padding: "14px", borderRadius: "8px", border: "1px solid var(--glow-crimson)" }}>
                <p style={{ color: "#FFF", fontSize: "0.9rem", fontWeight: 600, marginBottom: "12px" }}>
                  Confirm broadcasting SOS emergency alarm for Berth {selectedSeat}?
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn-spatial btn-spatial-crimson"
                    style={{ flex: 1, padding: "10px" }}
                    onClick={handleExecuteSOS}
                  >
                    CONFIRM SOS
                  </button>
                  <button
                    type="button"
                    className="btn-spatial btn-spatial-mint"
                    style={{ flex: 1, padding: "10px" }}
                    onClick={() => setSosConfirmOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* IRCTC Pantry Catering Card */}
          <div id="catering-menu-card" className="glass-panel" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px dashed var(--border-subtle)" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", margin: 0 }}>IRCTC PANTRY CAR MENU</h3>
                <div className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--glow-mint)", marginTop: "2px" }}>
                  Express Coach Seat Delivery
                </div>
              </div>
              <span className="status-badge-spatial claimed">LIVE SERVICE</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {CATERING_MENU.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</div>
                    <div className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.category}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <span className="font-mono-tech" style={{ color: "var(--glow-mint)", fontWeight: 700 }}>{item.price}</span>
                    <button
                      id={`order-btn-${item.id}`}
                      type="button"
                      className="btn-spatial btn-spatial-mint"
                      style={{ padding: "8px 16px" }}
                      onClick={() => handleOrderFood(item)}
                    >
                      Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {swapWarning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="swap-warning-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background: "rgba(45, 0, 0, 0.86)",
            backdropFilter: "blur(6px)"
          }}
        >
          <div style={{ width: "min(920px, 100%)", background: "#1a0606", border: "2px solid var(--glow-crimson)", borderRadius: "14px", boxShadow: "0 0 48px rgba(255, 42, 85, 0.45)", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid rgba(255, 42, 85, 0.45)" }}>
              <div>
                <div className="font-mono-tech" style={{ color: "var(--glow-crimson)", fontSize: "0.75rem", letterSpacing: "0.08em" }}>REGULATORY MISMATCH WARNING</div>
                <h3 id="swap-warning-title" style={{ marginTop: "4px", color: "#FFF" }}>SEAT SWAP REJECTED</h3>
              </div>
              <button type="button" className="btn-spatial btn-spatial-crimson" onClick={() => setSwapWarning(null)}>CLOSE</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)", gap: "20px", padding: "22px" }}>
              <div>
                <div className="font-mono-tech" style={{ color: "var(--glow-crimson)", fontSize: "0.7rem", letterSpacing: "0.08em" }}>BROKEN RULE</div>
                <p style={{ marginTop: "12px", color: "#FFD6D6", fontSize: "1rem", lineHeight: 1.6 }}>{swapWarning.reason}</p>
              </div>
              <div>
                <div className="font-mono-tech" style={{ color: "#FF9B9B", fontSize: "0.7rem", letterSpacing: "0.08em", marginBottom: "10px" }}>EXPOSED STATE — JUDGE VERIFICATION</div>
                <pre style={{ margin: 0, maxHeight: "320px", overflow: "auto", padding: "16px", borderRadius: "8px", background: "#090909", border: "1px solid #5A2424", color: "#F5DADA", fontSize: "0.78rem", lineHeight: 1.55 }}><code>{JSON.stringify(swapWarning.exposed_state, null, 2)}</code></pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {incomingSwapRequest && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="incoming-swap-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(6px)"
          }}
        >
          <div className="glass-panel" style={{ width: "min(480px, 100%)", padding: "26px", borderTop: "4px solid var(--glow-mint)" }}>
            <span className="font-mono-tech" style={{ color: "var(--glow-mint)", fontSize: "0.75rem", letterSpacing: "0.08em" }}>INCOMING CROSS-COACH SWAP REQUEST</span>
            <h3 id="incoming-swap-title" style={{ marginTop: "10px" }}>
              Incoming Swap Request from {incomingSwapRequest.initiatorCoach}-{incomingSwapRequest.initiatorSeat}
            </h3>
            <p style={{ marginTop: "10px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Passenger at {incomingSwapRequest.initiatorCoach}-{incomingSwapRequest.initiatorSeat} requests your berth at {incomingSwapRequest.targetCoach}-{incomingSwapRequest.targetSeat}.
            </p>
            <div style={{ display: "flex", gap: "12px", marginTop: "22px" }}>
              <button type="button" className="btn-spatial btn-spatial-mint" style={{ flex: 1 }} onClick={() => handleCrossCoachSwapResponse(true)}>ACCEPT</button>
              <button type="button" className="btn-spatial btn-spatial-crimson" style={{ flex: 1 }} onClick={() => handleCrossCoachSwapResponse(false)}>DECLINE</button>
            </div>
          </div>
        </div>
      )}

      {/* Accessible Digital Railway Ticket Stub Modal */}
      <dialog
        ref={receiptModalRef}
        id="ticket-receipt-modal"
        className="ticket-receipt-dialog"
        onClick={(e) => {
          if (e.target === receiptModalRef.current) closeReceiptModal();
        }}
      >
        {receipt && (
          <div className="ticket-stub">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#666" }}>
                  INDIAN RAILWAYS CATERING
                </div>
                <h3 style={{ color: "#111", fontSize: "1.1rem", marginTop: "2px" }}>PANTRY RECEIPT</h3>
              </div>
              <span className="stamp-confirmed">PAID & SENT</span>
            </div>

            <div className="ticket-stub-perforation" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem" }}>
              <div>
                <span style={{ color: "#666", fontSize: "0.7rem", display: "block" }}>RECEIPT NO.</span>
                <strong style={{ fontFamily: "var(--font-mono)" }}>{receipt.orderId}</strong>
              </div>
              <div>
                <span style={{ color: "#666", fontSize: "0.7rem", display: "block" }}>BERTH / SEAT</span>
                <strong style={{ fontFamily: "var(--font-mono)", color: "#10B981" }}>{receipt.seatId}</strong>
              </div>
              <div>
                <span style={{ color: "#666", fontSize: "0.7rem", display: "block" }}>ITEM</span>
                <strong>{receipt.item}</strong>
              </div>
              <div>
                <span style={{ color: "#666", fontSize: "0.7rem", display: "block" }}>AMOUNT</span>
                <strong style={{ fontFamily: "var(--font-mono)" }}>{receipt.price}</strong>
              </div>
              <div>
                <span style={{ color: "#666", fontSize: "0.7rem", display: "block" }}>TIME</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{receipt.timestamp}</span>
              </div>
              <div>
                <span style={{ color: "#666", fontSize: "0.7rem", display: "block" }}>DATE</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>{receipt.date}</span>
              </div>
            </div>

            <div className="ticket-stub-perforation" />

            <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#888", letterSpacing: "0.2em" }}>
              ||||| | |||| ||| ||||||| ||| ||
            </div>

            <button
              type="button"
              className="btn-close-modal"
              onClick={closeReceiptModal}
            >
              Close Receipt
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
