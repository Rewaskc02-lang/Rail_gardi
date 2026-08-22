import React, { useState, useEffect, useRef } from "react";
import socket from "../socket.js";
import { API_URL } from "../config.js";

const CATERING_MENU = [
  { id: "item-1", name: "Executive Veg Thali", category: "Full Meal", price: "$8" },
  { id: "item-2", name: "Masala Chai & Samosa Combo", category: "Hot Snacks", price: "$4" },
  { id: "item-3", name: "Paneer Grilled Sandwich", category: "Snacks", price: "$5" }
];

export default function PassengerPage() {
  const [pnrInput, setPnrInput] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passengerName, setPassengerName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [selectedSeat, setSelectedSeat] = useState("A1");
  const [receipt, setReceipt] = useState(null);
  const [seatsState, setSeatsState] = useState({
    A1: "empty", A2: "empty", A3: "claimed", A4: "sos",
    B1: "empty", B2: "empty", B3: "empty", B4: "empty",
    C1: "empty", C2: "empty", C3: "empty", C4: "empty"
  });
  const [sosConfirmOpen, setSosConfirmOpen] = useState(false);

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

    socket.on("state_update", handleStateUpdate);
    socket.on("seat_update", handleSeatUpdate);

    return () => {
      socket.off("state_update", handleStateUpdate);
      socket.off("seat_update", handleSeatUpdate);
    };
  }, [selectedSeat]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pnr: pnrInput.trim() })
      });

      const data = await response.json();
      if (response.ok && data.ok) {
        setIsLoggedIn(true);
        setPassengerName(data.passengerName);
        setLoginError("");
      } else {
        setLoginError(data.error || "Invalid PNR. Please check ticket details.");
      }
    } catch (err) {
      if (pnrInput.trim() === "1234567890" || pnrInput.trim() === "12345") {
        setIsLoggedIn(true);
        setPassengerName(pnrInput.trim() === "1234567890" ? "Rahul Sharma" : "Priya Patel");
      } else {
        setLoginError("Failed to connect to authentication server. (Offline Fallback Available)");
      }
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
              <label htmlFor="seat-selector" className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                ASSIGNED BERTH / SEAT NUMBER
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
