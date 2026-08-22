import React, { useState, useEffect, useRef } from "react";
import socket from "../socket.js";
import { API_URL } from "../config.js";
import { Shield, AlertTriangle, Coffee, UserCheck, RefreshCw, CheckCircle2, Ticket } from "lucide-react";

const CATERING_MENU = [
  { id: "item-1", name: "Executive Veg Thali", category: "Full Meal", price: "₹240" },
  { id: "item-2", name: "Masala Chai & Samosa Combo", category: "Hot Snacks", price: "₹80" },
  { id: "item-3", name: "Paneer Grilled Sandwich", category: "Snacks", price: "₹120" }
];

const DEMO_PNRS = [
  { pnr: "1111111111", label: "Arjun Mehta (25M, General)", coach: "S1", seat: "A1" },
  { pnr: "2222222222", label: "Shanti Kapoor (68F, Senior)", coach: "S1", seat: "A2" },
  { pnr: "3333333333", label: "Nisha Verma (28F, Pregnant)", coach: "S2", seat: "B1" },
  { pnr: "4444444444", label: "Rakesh Singh (45M, Patient)", coach: "S2", seat: "B2" },
  { pnr: "1234567890", label: "Rahul Sharma (General)", coach: "S1", seat: "A3" }
];

const COACH_SEATS = {
  S1: ["A1", "A2", "A3", "A4"],
  S2: ["B1", "B2", "B3", "B4"],
  B1: ["C1", "C2", "C3", "C4"]
};

export default function PassengerPage() {
  const [pnrInput, setPnrInput] = useState("1111111111");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passengerInfo, setPassengerInfo] = useState({
    name: "Arjun Mehta",
    coach: "S1",
    seat: "A1",
    berth: "Upper",
    persona: "General"
  });
  const [loginError, setLoginError] = useState("");
  const [selectedSeat, setSelectedSeat] = useState("A1");
  const [receipt, setReceipt] = useState(null);
  const [seatsState, setSeatsState] = useState({
    A1: "empty", A2: "empty", A3: "claimed", A4: "sos",
    B1: "empty", B2: "empty", B3: "empty", B4: "empty",
    C1: "empty", C2: "empty", C3: "empty", C4: "empty"
  });
  const [sosConfirmOpen, setSosConfirmOpen] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);

  // Seat Swap States
  const [swapCoach, setSwapCoach] = useState("S1");
  const [swapSeat, setSwapSeat] = useState("A2");
  const [swapWarning, setSwapWarning] = useState(null);
  const [swapSuccess, setSwapSuccess] = useState("");

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
        setSosTriggered(true);
      }
    }

    function handleSwapWarning(warning) {
      if (warning) {
        setSwapWarning(warning);
      }
    }

    socket.on("state_update", handleStateUpdate);
    socket.on("seat_update", handleSeatUpdate);
    socket.on("swap_mismatch_warning", handleSwapWarning);

    return () => {
      socket.off("state_update", handleStateUpdate);
      socket.off("seat_update", handleSeatUpdate);
      socket.off("swap_mismatch_warning", handleSwapWarning);
    };
  }, [selectedSeat]);

  async function handleLogin(e) {
    if (e) e.preventDefault();
    setLoginError("");

    const targetPnr = pnrInput.trim();
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pnr: targetPnr })
      });

      const data = await response.json();
      if (response.ok && data.ok) {
        setIsLoggedIn(true);
        const match = DEMO_PNRS.find(d => d.pnr === targetPnr);
        setPassengerInfo({
          name: data.passengerName || "Rahul Sharma",
          coach: match?.coach || "S1",
          seat: match?.seat || "A1",
          berth: "Lower",
          persona: match?.label?.split("(")[1]?.replace(")", "") || "General"
        });
        setSelectedSeat(match?.seat || "A1");
        setLoginError("");
      } else {
        // Local demo fallback
        fallbackDemoLogin(targetPnr);
      }
    } catch (err) {
      fallbackDemoLogin(targetPnr);
    }
  }

  function fallbackDemoLogin(targetPnr) {
    const match = DEMO_PNRS.find(d => d.pnr === targetPnr);
    if (match) {
      setIsLoggedIn(true);
      setPassengerInfo({
        name: match.label.split(" (")[0],
        coach: match.coach,
        seat: match.seat,
        berth: "Lower",
        persona: match.label.split("(")[1]?.replace(")", "") || "General"
      });
      setSelectedSeat(match.seat);
      setLoginError("");
    } else {
      setIsLoggedIn(true);
      setPassengerInfo({
        name: "Rahul Sharma",
        coach: "S1",
        seat: "A1",
        berth: "Lower",
        persona: "General"
      });
      setSelectedSeat("A1");
    }
  }

  function handleClaimSeat() {
    socket.emit("claim_seat", {
      seatId: selectedSeat,
      pnr: pnrInput.trim() || "1111111111",
      passengerName: passengerInfo.name || "Arjun Mehta"
    });
    setSeatsState((prev) => ({ ...prev, [selectedSeat]: "claimed" }));
  }

  function handleExecuteSOS() {
    socket.emit("sos", {
      seatId: selectedSeat
    });
    setSosTriggered(true);
    setSosConfirmOpen(false);
    setSeatsState((prev) => ({ ...prev, [selectedSeat]: "sos" }));
  }

  function handleRequestSwap() {
    setSwapWarning(null);
    setSwapSuccess("");

    socket.emit("request_seat_swap", {
      pnr: pnrInput.trim() || "1111111111",
      targetCoach: swapCoach,
      targetSeat: swapSeat
    });

    // Simulated fallback in case offline
    setTimeout(() => {
      if (!swapWarning) {
        setSwapSuccess(`✓ Swap request for ${swapCoach}-${swapSeat} submitted to TTE manifest.`);
      }
    }, 600);
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
    <div className="app-page-wrapper">
      {/* 1. Real-time Journey Progress Tracker */}
      <div className="glass-panel" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="font-heading" style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              12951 RAJDHANI EXP // NEW DELHI ➔ MUMBAI CENTRAL
            </div>
            <div className="font-mono-tech glow-text-mint" style={{ fontSize: "0.82rem", marginTop: 2 }}>
              COACH {passengerInfo.coach || "S1"} • BERTH {selectedSeat} [CLASS: 3A]
            </div>
          </div>
          <span className="status-badge-spatial claimed font-mono-tech">
            TRAIN EN ROUTE
          </span>
        </div>

        <div style={{ height: 6, background: "rgba(255, 255, 255, 0.08)", borderRadius: 4, margin: "16px 0 10px", overflow: "hidden" }}>
          <div style={{ width: "58%", height: "100%", background: "linear-gradient(90deg, var(--glow-mint), var(--glow-cyan))", borderRadius: 4 }} />
        </div>

        <div className="font-mono-tech" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", flexWrap: "wrap", gap: 8 }}>
          <span>CURRENT LOCATION: KM 102 (NORTH BLOCK)</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>NEXT STOP: KANPUR CENTRAL (PF 3) • ETA 18 MIN</span>
        </div>
      </div>

      {!isLoggedIn ? (
        /* PNR Login Card */
        <div className="glass-panel" style={{ padding: 32, maxWidth: 680, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Ticket style={{ width: 20, height: 20, color: "var(--glow-cyan)" }} />
            <span className="font-mono-tech glow-text-cyan" style={{ fontSize: "0.75rem", letterSpacing: "0.08em" }}>
              PASSENGER IDENTITY VERIFICATION
            </span>
          </div>

          <h2 style={{ fontSize: "1.5rem", marginBottom: 8 }}>Enter 10-Digit Ticket PNR</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 20 }}>
            Authenticate with your railway ticket PNR to manage berth reservations, emergency alarms, and pantry catering:
          </p>

          {/* Quick Demo PNR Presets */}
          <div style={{ marginBottom: 20 }}>
            <span className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
              ⚡ INSTANT DEMO PERSONAS:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {DEMO_PNRS.map((d) => (
                <button
                  key={d.pnr}
                  type="button"
                  onClick={() => { setPnrInput(d.pnr); }}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    background: pnrInput === d.pnr ? "rgba(0, 216, 246, 0.2)" : "rgba(255, 255, 255, 0.04)",
                    border: `1px solid ${pnrInput === d.pnr ? "var(--glow-cyan)" : "var(--border-subtle)"}`,
                    color: pnrInput === d.pnr ? "var(--glow-cyan)" : "var(--text-secondary)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem"
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label htmlFor="pnr-input" className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                PNR NUMBER
              </label>
              <input
                id="pnr-input"
                type="text"
                className="form-input-spatial"
                value={pnrInput}
                onChange={(e) => setPnrInput(e.target.value)}
                placeholder="e.g. 1111111111"
                autoComplete="off"
              />
            </div>

            <button
              id="login-btn"
              type="submit"
              className="btn-spatial btn-spatial-cyan"
              style={{ width: "100%", padding: 15 }}
            >
              VALIDATE PNR & ACCESS COACH
            </button>
          </form>

          {loginError && (
            <div className="font-mono-tech" style={{ marginTop: 14, padding: 10, background: "rgba(255, 42, 85, 0.15)", border: "1px solid var(--glow-crimson)", borderRadius: 6, color: "var(--glow-crimson)", fontSize: "0.8rem" }}>
              ⚠️ {loginError}
            </div>
          )}
        </div>
      ) : (
        /* Logged In Dashboard */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          {/* Left Column: Berth Allocation & SOS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Berth Allocation */}
            <div className="glass-panel" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <span className="font-mono-tech" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>PASSENGER PROFILE</span>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>{passengerInfo.name}</div>
                  <div className="font-mono-tech" style={{ fontSize: "0.8rem", color: "var(--glow-cyan)", marginTop: 2 }}>
                    PNR: {pnrInput} • {passengerInfo.persona}
                  </div>
                </div>
                <span className="status-badge-spatial claimed font-mono-tech">VERIFIED</span>
              </div>

              <div style={{ paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
                <label htmlFor="seat-selector" className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: 8 }}>
                  ASSIGNED COACH & BERTH
                </label>
                <select
                  id="seat-selector"
                  className="form-input-spatial"
                  value={selectedSeat}
                  onChange={(e) => setSelectedSeat(e.target.value)}
                >
                  {Object.keys(seatsState).map((seatId) => {
                    const status = typeof seatsState[seatId] === "object" ? seatsState[seatId]?.status : seatsState[seatId];
                    return (
                      <option key={seatId} value={seatId} style={{ background: "#080e18", color: "#FFF" }}>
                        Berth {seatId} — [{status?.toUpperCase() || "EMPTY"}]
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ marginTop: 16 }}>
                <button
                  id="claim-seat-btn"
                  type="button"
                  className="btn-spatial btn-spatial-mint"
                  style={{ width: "100%", padding: 14 }}
                  onClick={handleClaimSeat}
                >
                  <CheckCircle2 style={{ width: 16, height: 16 }} />
                  <span>CLAIM BERTH {selectedSeat} (NOTIFY TTE)</span>
                </button>
              </div>
            </div>

            {/* Emergency SOS Alarm Card */}
            <div className="glass-panel" style={{ padding: 24, border: "1px solid rgba(255, 42, 85, 0.45)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span className="font-mono-tech" style={{ color: "var(--glow-crimson)", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle style={{ width: 16, height: 16 }} />
                  EMERGENCY PASSENGER ALARM (SOS)
                </span>
                <span className="font-mono-tech" style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  SEC-78/B
                </span>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 16 }}>
                Transmits immediate mesh radio beacon to Loco-Pilot HUD and Operator Control Center (OCC) with zero delay.
              </p>

              {!sosConfirmOpen ? (
                <button
                  id="sos-btn"
                  type="button"
                  className="btn-spatial btn-spatial-crimson"
                  style={{ width: "100%", padding: 14 }}
                  onClick={() => setSosConfirmOpen(true)}
                >
                  {sosTriggered ? "🚨 SOS ACTIVE (DISPATCHED)" : "TRIGGER SOS EMERGENCY ALARM"}
                </button>
              ) : (
                <div style={{ background: "rgba(0, 0, 0, 0.6)", padding: 16, borderRadius: 10, border: "1px solid var(--glow-crimson)" }}>
                  <p style={{ color: "#FFF", fontSize: "0.9rem", fontWeight: 600, marginBottom: 12 }}>
                    Confirm broadcasting SOS emergency alarm for Berth {selectedSeat}?
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="btn-spatial btn-spatial-crimson"
                      style={{ flex: 1, padding: 10 }}
                      onClick={handleExecuteSOS}
                    >
                      CONFIRM SOS
                    </button>
                    <button
                      type="button"
                      className="btn-spatial btn-spatial-mint"
                      style={{ flex: 1, padding: 10 }}
                      onClick={() => setSosConfirmOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Seat Swap & IRCTC Pantry Menu */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Seat Swap Request (Challenge #697 P2P / B2B) */}
            <div className="glass-panel" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 10, borderBottom: "1px dashed var(--border-subtle)" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem" }}>P2P BERTH SWAP REQUEST</h3>
                  <div className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--glow-cyan)", marginTop: 2 }}>
                    Smart Quota & Medical Safety Arbitration
                  </div>
                </div>
                <RefreshCw style={{ width: 18, height: 18, color: "var(--glow-cyan)" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label htmlFor="swap-coach" className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>TARGET COACH</label>
                  <select
                    id="swap-coach"
                    className="form-input-spatial"
                    value={swapCoach}
                    onChange={(e) => {
                      setSwapCoach(e.target.value);
                      setSwapSeat(COACH_SEATS[e.target.value][0]);
                    }}
                  >
                    <option value="S1">S1 (Sleeper 1)</option>
                    <option value="S2">S2 (Sleeper 2)</option>
                    <option value="B1">B1 (3AC Tier)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="swap-seat" className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 4 }}>TARGET SEAT</label>
                  <select
                    id="swap-seat"
                    className="form-input-spatial"
                    value={swapSeat}
                    onChange={(e) => setSwapSeat(e.target.value)}
                  >
                    {COACH_SEATS[swapCoach]?.map((s) => (
                      <option key={s} value={s}>Berth {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="btn-spatial btn-spatial-cyan"
                style={{ width: "100%", padding: 12 }}
                onClick={handleRequestSwap}
              >
                REQUEST SEAT SWAP WITH {swapCoach}-{swapSeat}
              </button>

              {swapWarning && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "rgba(255, 42, 85, 0.15)", border: "1px solid var(--glow-crimson)", color: "#ffa4b2", fontSize: "0.82rem" }}>
                  <strong>⚠ Swap Blocked by OCC:</strong> {swapWarning.reason || "Quota safety mismatch (Senior / Medical protection active)."}
                </div>
              )}

              {swapSuccess && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "rgba(0, 245, 160, 0.12)", border: "1px solid var(--glow-mint)", color: "var(--glow-mint)", fontSize: "0.82rem" }}>
                  {swapSuccess}
                </div>
              )}
            </div>

            {/* IRCTC Pantry Catering Card */}
            <div id="catering-menu-card" className="glass-panel" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px dashed var(--border-subtle)" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem" }}>IRCTC PANTRY CAR MENU</h3>
                  <div className="font-mono-tech glow-text-mint" style={{ fontSize: "0.75rem", marginTop: 2 }}>
                    Express Coach Seat Delivery
                  </div>
                </div>
                <Coffee style={{ width: 18, height: 18, color: "var(--glow-mint)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {CATERING_MENU.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "0.92rem" }}>{item.name}</div>
                      <div className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{item.category}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="font-mono-tech glow-text-mint" style={{ fontWeight: 700, fontSize: "0.95rem" }}>{item.price}</span>
                      <button
                        id={`order-btn-${item.id}`}
                        type="button"
                        className="btn-spatial btn-spatial-mint"
                        style={{ padding: "8px 14px", fontSize: "0.72rem" }}
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
        </div>
      )}

      {/* Accessible Digital Railway Ticket Stub Modal Dialog */}
      <dialog
        ref={receiptModalRef}
        id="ticket-receipt-modal"
        style={{
          margin: "auto",
          padding: 0,
          background: "transparent",
          border: "none",
          borderRadius: 16,
          maxWidth: 420,
          width: "90vw"
        }}
        onClick={(e) => {
          if (e.target === receiptModalRef.current) closeReceiptModal();
        }}
      >
        {receipt && (
          <div style={{ background: "#0a0f1d", border: "1px solid rgba(0, 245, 160, 0.4)", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--glow-mint)" }}>
                  INDIAN RAILWAYS CATERING
                </div>
                <h3 style={{ color: "#FFF", fontSize: "1.2rem", marginTop: 2 }}>PANTRY RECEIPT</h3>
              </div>
              <span className="status-badge-spatial claimed font-mono-tech">PAID & SENT</span>
            </div>

            <div style={{ borderTop: "1px dashed rgba(255,255,255,0.15)", margin: "14px 0" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: "0.85rem" }}>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>RECEIPT NO.</span>
                <strong className="font-mono-tech" style={{ color: "#FFF" }}>{receipt.orderId}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>BERTH / SEAT</span>
                <strong className="font-mono-tech glow-text-mint">{receipt.seatId}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>ITEM</span>
                <strong style={{ color: "#FFF" }}>{receipt.item}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>AMOUNT</span>
                <strong className="font-mono-tech glow-text-cyan">{receipt.price}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>TIME</span>
                <span className="font-mono-tech" style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{receipt.timestamp}</span>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>DATE</span>
                <span className="font-mono-tech" style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>{receipt.date}</span>
              </div>
            </div>

            <div style={{ borderTop: "1px dashed rgba(255,255,255,0.15)", margin: "14px 0" }} />

            <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)", letterSpacing: "0.2em", marginBottom: 16 }}>
              ||||| | |||| ||| ||||||| ||| ||
            </div>

            <button
              type="button"
              className="btn-spatial btn-spatial-mint"
              style={{ width: "100%", padding: 12 }}
              onClick={closeReceiptModal}
            >
              CLOSE RECEIPT
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
