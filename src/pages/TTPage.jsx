import React, { useState, useEffect, useRef } from "react";
import socket from "../socket.js";
import { Users, AlertCircle, CheckCircle2, ShieldAlert, Coffee } from "lucide-react";

const DEFAULT_SEATS = {
  A1: "claimed",
  A2: "empty",
  A3: "claimed",
  A4: "sos",
  B1: "empty",
  B2: "claimed",
  B3: "empty",
  B4: "empty",
  C1: "empty",
  C2: "empty",
  C3: "claimed",
  C4: "empty"
};

const DEFAULT_META = {
  A1: { passengerName: "Arjun Mehta", pnr: "1111111111", foodOrder: ["Executive Veg Thali"] },
  A3: { passengerName: "Vikram Malhotra", pnr: "1234567890", foodOrder: null },
  A4: { passengerName: "Ananya Roy", pnr: "12345", foodOrder: null },
  B2: { passengerName: "Rakesh Singh", pnr: "4444444444", foodOrder: ["Masala Chai & Samosa Combo"] },
  C3: { passengerName: "Meera Joshi", pnr: "1212121212", foodOrder: null }
};

export default function TTPage() {
  const [seats, setSeats] = useState(DEFAULT_SEATS);
  const [seatMeta, setSeatMeta] = useState(DEFAULT_META);
  const [animatingSeats, setAnimatingSeats] = useState({});
  const prevSeatsRef = useRef(seats);

  function triggerFlapAnimation(seatId) {
    setAnimatingSeats((prev) => ({ ...prev, [seatId]: true }));
    setTimeout(() => {
      setAnimatingSeats((prev) => ({ ...prev, [seatId]: false }));
    }, 450);
  }

  useEffect(() => {
    function handleStateUpdate(fullState) {
      if (fullState && fullState.seats && Object.keys(fullState.seats).length > 0) {
        Object.keys(fullState.seats).forEach((id) => {
          const currentStatus = typeof fullState.seats[id] === "object" ? fullState.seats[id]?.status : fullState.seats[id];
          const prevStatus = typeof prevSeatsRef.current[id] === "object" ? prevSeatsRef.current[id]?.status : prevSeatsRef.current[id];
          if (currentStatus !== prevStatus) {
            triggerFlapAnimation(id);
          }
        });
        prevSeatsRef.current = fullState.seats;
        setSeats(fullState.seats);
        if (fullState.seatMeta) setSeatMeta((prev) => ({ ...prev, ...fullState.seatMeta }));
      }
    }

    function handleSeatUpdate(update) {
      if (!update || !update.seatId) return;
      const { seatId, status, passengerName, pnr, foodOrder } = update;

      const prevStatus = typeof prevSeatsRef.current[seatId] === "object" ? prevSeatsRef.current[seatId]?.status : prevSeatsRef.current[seatId];
      if (prevStatus !== status) {
        triggerFlapAnimation(seatId);
      }

      setSeats((prev) => {
        const next = { ...prev, [seatId]: status };
        prevSeatsRef.current = next;
        return next;
      });

      if (passengerName || pnr || foodOrder) {
        setSeatMeta((prev) => ({
          ...prev,
          [seatId]: {
            ...(prev[seatId] || {}),
            passengerName: passengerName || prev[seatId]?.passengerName,
            pnr: pnr || prev[seatId]?.pnr,
            foodOrder: foodOrder || prev[seatId]?.foodOrder
          }
        }));
      }
    }

    socket.on("state_update", handleStateUpdate);
    socket.on("seat_update", handleSeatUpdate);

    return () => {
      socket.off("state_update", handleStateUpdate);
      socket.off("seat_update", handleSeatUpdate);
    };
  }, []);

  const safeSeats = seats && Object.keys(seats).length > 0 ? seats : DEFAULT_SEATS;
  const seatEntries = Object.entries(safeSeats);
  const totalSeats = seatEntries.length;
  const claimedCount = seatEntries.filter(([_, s]) => (typeof s === "object" ? s?.status : s) === "claimed").length;
  const sosCount = seatEntries.filter(([_, s]) => (typeof s === "object" ? s?.status : s) === "sos").length;
  const vacantCount = Math.max(0, totalSeats - claimedCount - sosCount);

  return (
    <div className="app-page-wrapper">
      {/* 1. Overview Stats Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div className="glass-panel" style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>TOTAL BERTH CAPACITY</span>
            <Users style={{ width: 18, height: 18, color: "var(--text-muted)" }} />
          </div>
          <div className="font-mono-tech" style={{ fontSize: "2.2rem", fontWeight: 800, marginTop: 4 }}>{totalSeats}</div>
        </div>

        <div className="glass-panel" style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-mono-tech glow-text-mint" style={{ fontSize: "0.72rem" }}>VERIFIED CLAIMED</span>
            <CheckCircle2 style={{ width: 18, height: 18, color: "var(--glow-mint)" }} />
          </div>
          <div className="font-mono-tech glow-text-mint" style={{ fontSize: "2.2rem", fontWeight: 800, marginTop: 4 }}>{claimedCount}</div>
        </div>

        <div className="glass-panel" style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>VACANT BERTHS</span>
            <AlertCircle style={{ width: 18, height: 18, color: "var(--text-muted)" }} />
          </div>
          <div className="font-mono-tech" style={{ fontSize: "2.2rem", fontWeight: 800, marginTop: 4 }}>{vacantCount}</div>
        </div>

        <div className="glass-panel" style={{ padding: "18px 22px", borderColor: sosCount > 0 ? "var(--glow-crimson)" : "var(--border-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--glow-crimson)" }}>ACTIVE SOS ALARMS</span>
            <ShieldAlert style={{ width: 18, height: 18, color: "var(--glow-crimson)" }} />
          </div>
          <div className="font-mono-tech glow-text-crimson" style={{ fontSize: "2.2rem", fontWeight: 800, marginTop: 4 }}>
            {sosCount > 0 ? `🚨 ${sosCount}` : "0"}
          </div>
        </div>
      </div>

      {/* 2. Main Split-Flap Matrix Grid */}
      <div className="glass-panel" style={{ padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="font-mono-tech glow-text-mint" style={{ fontSize: "0.8rem", fontWeight: 700 }}>
              📟 COACH B-2 // OPERATOR CONTROL CENTER (OCC) LIVE MANIFEST
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>
              Ticket Examiner (TTE) Split-Flap Matrix • Real-time LoRa Telemetry Relay
            </div>
          </div>
          <span className="status-badge-spatial claimed font-mono-tech">12-BERTH MATRIX ACTIVE</span>
        </div>

        <div id="seats-container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {seatEntries.map(([seatId, rawData]) => {
            const status = typeof rawData === "object" ? rawData?.status || "empty" : rawData || "empty";
            const meta = seatMeta[seatId] || {};
            const isAnimating = animatingSeats[seatId];
            const isSOS = status === "sos";
            const isClaimed = status === "claimed";

            return (
              <div
                key={seatId}
                id={`seat-${seatId}`}
                className={`split-flap-spatial-card status-${status} ${isAnimating ? "flap-animating" : ""}`}
              >
                {/* Flap Upper Leaf */}
                <div className="flap-top-leaf">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span className="font-mono-tech" style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
                      {seatId}
                    </span>
                    <span className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {seatId.startsWith("A") ? "MAIN BAY 1" : seatId.startsWith("B") ? "MAIN BAY 2" : "SIDE COUPE"}
                    </span>
                  </div>
                </div>

                {/* Flap Lower Leaf */}
                <div className="flap-bottom-leaf">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      id={`status-${seatId}`}
                      className={`status-badge-spatial ${status}`}
                    >
                      {isSOS && "🚨 "}
                      {status?.toUpperCase() || "EMPTY"}
                    </span>

                    {isSOS && (
                      <span className="font-mono-tech" style={{ color: "var(--glow-crimson)", fontSize: "0.72rem", fontWeight: 700 }}>
                        EMERGENCY SOS
                      </span>
                    )}
                  </div>
                </div>

                {/* Passenger & Catering Details */}
                <div style={{ padding: "14px 20px", background: "rgba(6, 9, 14, 0.6)", borderTop: "1px solid var(--border-subtle)", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Occupant:</span>
                    <strong style={{ color: isClaimed || isSOS ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {meta.passengerName || (isClaimed ? "Passenger" : "Unoccupied")}
                    </strong>
                  </div>

                  {meta.pnr && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>PNR:</span>
                      <span className="font-mono-tech glow-text-cyan">{meta.pnr}</span>
                    </div>
                  )}

                  {meta.foodOrder && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--glow-mint)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Coffee style={{ width: 13, height: 13 }} />
                        <span>Pantry:</span>
                      </span>
                      <span className="font-mono-tech">
                        {Array.isArray(meta.foodOrder) ? meta.foodOrder.join(", ") : JSON.stringify(meta.foodOrder)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
