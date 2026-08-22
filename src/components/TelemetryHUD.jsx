import React, { useState, useEffect } from "react";
import socket from "../socket.js";

/**
 * TelemetryHUD
 * Restricts complex floating corner cards strictly to the Landing route (`/`).
 * Mounts a universal, slim, non-colliding fixed bottom telemetry ticker across all views.
 */
export default function TelemetryHUD() {
  const [telemetryState, setTelemetryState] = useState({
    speed: 78,
    visibility: "< 45m",
    signalState: "GREEN",
    signal: "GREEN",
    sector: "100KM NORTH BLOCK"
  });

  useEffect(() => {
    function handleState(fullState) {
      if (fullState && fullState.telemetry) {
        setTelemetryState((prev) => ({
          ...prev,
          ...fullState.telemetry,
          signalState: fullState.telemetry.signalState || fullState.telemetry.signal || "GREEN"
        }));
      }
    }
    function handleTelemetry(data) {
      if (data) {
        setTelemetryState((prev) => ({
          ...prev,
          ...data,
          signalState: data.signalState || data.signal || prev.signalState
        }));
      }
    }

    socket.on("state_update", handleState);
    socket.on("telemetry_update", handleTelemetry);

    return () => {
      socket.off("state_update", handleState);
      socket.off("telemetry_update", handleTelemetry);
    };
  }, []);

  const isRed = (telemetryState.signalState || telemetryState.signal) === "RED";

  return (
    <>
      {/* Universal slim bottom ticker; floating HUD cards were intentionally removed. */}
      <footer className="hud-bottom-bar" aria-label="Live Operations Telemetry Stream">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Signal Aspect Pill */}
          <div className="hud-telemetry-pill">
            <span
              className="hud-dot"
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isRed ? "var(--glow-crimson)" : "var(--glow-mint)",
                boxShadow: isRed ? "0 0 10px var(--glow-crimson)" : "0 0 10px var(--glow-mint)"
              }}
            />
            <span
              className="font-mono-tech"
              style={{
                fontSize: "0.78rem",
                color: isRed ? "var(--glow-crimson)" : "var(--glow-mint)",
                fontWeight: 700
              }}
            >
              ASPECT: {isRed ? "RED // EMERGENCY BRAKE" : "GREEN // LINE CLEAR"}
            </span>
          </div>

          {/* Speed Pill */}
          <div className="hud-telemetry-pill">
            <span className="font-mono-tech" style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              SPEED: <strong style={{ color: isRed ? "var(--glow-crimson)" : "var(--glow-cyan)" }}>
                {isRed ? "0 KM/H" : `${telemetryState.speed || 78} KM/H`}
              </strong>
            </span>
          </div>

          {/* Optical Visibility Pill */}
          <div className="hud-telemetry-pill hide-mobile">
            <span className="font-mono-tech" style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              VISIBILITY: <span style={{ color: "var(--glow-amber)" }}>{telemetryState.visibility || "< 45m"} [DENSE FOG]</span>
            </span>
          </div>

          {/* Sector Pill */}
          <div className="hud-telemetry-pill hide-mobile">
            <span className="font-mono-tech" style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              BLOCK: <span style={{ color: "var(--text-primary)" }}>{telemetryState.sector || "100KM NORTH BLOCK"}</span>
            </span>
          </div>
        </div>

        {/* Brand / Relay Status */}
        <div className="font-mono-tech hide-mobile" style={{ fontSize: "0.72rem", color: "var(--glow-cyan)", opacity: 0.9 }}>
          ⚡ 433MHz CAB TELEMETRY // LIVE
        </div>
      </footer>
    </>
  );
}
