import React, { useState, useEffect, useRef } from "react";
import socket from "../socket.js";

export default function TTPage() {
  const [seats, setSeats] = useState({
    A1: "empty", A2: "empty", A3: "claimed", A4: "sos",
    B1: "empty", B2: "empty", B3: "empty", B4: "empty",
    C1: "empty", C2: "empty", C3: "empty", C4: "empty"
  });

  const [seatMeta, setSeatMeta] = useState({
    A3: { passengerName: "Vikram Malhotra", pnr: "1234567890" },
    A4: { passengerName: "Ananya Roy", pnr: "12345" }
  });
  const [passengerManifest, setPassengerManifest] = useState({});

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
      if (fullState && fullState.seats) {
        Object.keys(fullState.seats).forEach((id) => {
          const currentStatus = typeof fullState.seats[id] === "object" ? fullState.seats[id]?.status : fullState.seats[id];
          const prevStatus = typeof prevSeatsRef.current[id] === "object" ? prevSeatsRef.current[id]?.status : prevSeatsRef.current[id];
          if (currentStatus !== prevStatus) {
            triggerFlapAnimation(id);
          }
        });
        prevSeatsRef.current = fullState.seats;
        setSeats(fullState.seats);
        if (fullState.seatMeta) setSeatMeta(fullState.seatMeta);
      }
      if (fullState?.passengerManifest) {
        setPassengerManifest(fullState.passengerManifest);
      }
    }

    function handleSeatUpdate(update) {
      if (!update) return;
      // The server now broadcasts the legacy flat seat map: { A1: "claimed", ... }.
      if (!update.seatId) {
        prevSeatsRef.current = update;
        setSeats(update);
        return;
      }
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

    function requestInitialState() {
      socket.emit("request_initial_state", (fullState) => {
        if (fullState) handleStateUpdate(fullState);
      });
    }

    socket.on("connect", requestInitialState);
    requestInitialState();

    return () => {
      socket.off("state_update", handleStateUpdate);
      socket.off("seat_update", handleSeatUpdate);
      socket.off("connect", requestInitialState);
    };
  }, []);

  const manifestEntries = Object.entries(passengerManifest).sort(([, a], [, b]) => {
    const coachOrder = { S1: 1, S2: 2, B1: 3 };
    return coachOrder[a.coach] - coachOrder[b.coach] || a.seat.localeCompare(b.seat);
  });
  const totalSeats = manifestEntries.length || Object.keys(seats).length;
  const claimedCount = Object.values(seats).filter((status) => status === "claimed").length;
  const sosCount = Object.values(seats).filter((status) => status === "sos").length;
  const vacantCount = Math.max(0, totalSeats - claimedCount - sosCount);

  return (
    <div className="tt-container">
      <button
        id="admin-reset-network-state-btn"
        type="button"
        className="btn-spatial btn-spatial-crimson"
        style={{ marginBottom: "16px", width: "100%", border: "2px solid var(--glow-crimson)" }}
        onClick={() => socket.emit("admin_reset_state")}
      >
        ADMIN: RESET NETWORK STATE
      </button>

      {/* Overview Stats Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <div className="glass-panel" style={{ padding: "18px 22px" }}>
          <span className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>TOTAL BERTH CAPACITY</span>
          <div className="font-mono-tech" style={{ fontSize: "2rem", fontWeight: 800, marginTop: "4px" }}>{totalSeats}</div>
        </div>
        <div className="glass-panel" style={{ padding: "18px 22px" }}>
          <span className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--glow-mint)" }}>VERIFIED CLAIMED</span>
          <div className="font-mono-tech glow-text-mint" style={{ fontSize: "2rem", fontWeight: 800, marginTop: "4px" }}>{claimedCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: "18px 22px" }}>
          <span className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>VACANT BERTHS</span>
          <div className="font-mono-tech" style={{ fontSize: "2rem", fontWeight: 800, marginTop: "4px" }}>{vacantCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: "18px 22px", borderColor: sosCount > 0 ? "var(--glow-crimson)" : "var(--border-subtle)" }}>
          <span className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--glow-crimson)" }}>ACTIVE SOS ALARMS</span>
          <div className="font-mono-tech glow-text-crimson" style={{ fontSize: "2rem", fontWeight: 800, marginTop: "4px" }}>
            {sosCount > 0 ? `🚨 ${sosCount}` : "0"}
          </div>
        </div>
      </div>

      {/* Main Split-Flap Matrix Grid */}
      <div className="glass-panel" style={{ padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div className="font-mono-tech" style={{ fontSize: "0.8rem", color: "var(--glow-mint)", fontWeight: 700 }}>
              📟 ALL COACHES // OPERATOR CONTROL CENTER (OCC) LIVE PNR MANIFEST
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              Ticket Examiner (TTE) Split-Flap Matrix • Real-time LoRa Telemetry Relay
            </div>
          </div>
          <span className="status-badge-spatial claimed">{totalSeats}-PASSENGER MATRIX</span>
        </div>

        <div id="seats-container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
          {manifestEntries.map(([pnr, passenger]) => {
            const seatId = passenger.seat;
            const status = seats[seatId] || "empty";
            const meta = seatMeta[seatId] || {};
            const isAnimating = animatingSeats[seatId];
            const isSOS = status === "sos";
            const isClaimed = status === "claimed";

            return (
              <div
                key={pnr}
                id={`seat-${passenger.coach}-${seatId}`}
                className={`split-flap-spatial-card status-${status} ${isAnimating ? "flap-animating" : ""}`}
              >
                {/* Flap Display */}
                <div>
                  <div className="flap-top-leaf">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span className="font-mono-tech" style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--text-primary)" }}>
                        {seatId}
                      </span>
                      <span className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        COACH {passenger.coach} • {passenger.berth.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flap-bottom-leaf">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        id={`status-${seatId}`}
                        className={`status-badge-spatial ${status} ${status === "claimed" || status === "sos" ? "pulse-glow" : ""}`}
                      >
                        {isSOS && "🚨 "}
                        {status?.toUpperCase() || "EMPTY"}
                      </span>

                      {isSOS && (
                        <span className="font-mono-tech" style={{ color: "var(--glow-crimson)", fontSize: "0.75rem", fontWeight: 700 }}>
                          EMERGENCY SOS
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Passenger & Catering Details */}
                <div style={{ padding: "14px 20px", background: "rgba(0, 0, 0, 0.4)", borderTop: "1px solid var(--border-subtle)", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--text-muted)" }}>Occupant:</span>
                    <strong>{isClaimed || isSOS ? passenger.passengerName : "Unoccupied"}</strong>
                  </div>

                  {(isClaimed || isSOS) && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>PNR:</span>
                        <span className="font-mono-tech" style={{ color: "var(--text-primary)" }}>{pnr}</span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem" }}>
                        <span style={{ color: "var(--text-muted)" }}>Context:</span>
                        <span className="font-mono-tech" style={{ color: "var(--glow-mint)" }}>{passenger.age}{passenger.gender} • {passenger.persona}</span>
                      </div>
                    </>
                  )}

                  {meta.foodOrder && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--glow-mint)" }}>
                      <span>Pantry Order:</span>
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
