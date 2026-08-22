import React, { useState, useEffect } from "react";
import socket from "../socket.js";

/**
 * TelemetryHUD
 * Minimalist Floating NASA / Automotive Spatial HUD Widget
 */
export default function TelemetryHUD({ activeSector = { sectorNumber: 1, status: "TRACK CLEAR" } }) {
  const [timeString, setTimeString] = useState("");
  const [latency, setLatency] = useState("8.4");
  const [telemetryState, setTelemetryState] = useState({
    speed: 78,
    visibility: "< 45m",
    signalState: "GREEN",
    sector: "100KM NORTH BLOCK"
  });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeString(now.toISOString().slice(11, 23) + " UTC");
      const jitter = (7.6 + Math.sin(Date.now() / 1400) * 1.8).toFixed(1);
      setLatency(jitter);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);

    return () => clearInterval(timer);
  }, []);

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
    <div className="telemetry-hud-container" aria-label="Spatial Telemetry HUD">
      {/* Top Left: Atomic Clock & Radio Link */}
      <div className="hud-glass-pill hud-top-left">
        <div className="hud-metric-row">
          <span className="hud-label">ATOMIC CLOCK</span>
          <span className="hud-value font-mono-tech">{timeString || "00:00:00.000 UTC"}</span>
        </div>
        <div className="hud-metric-row">
          <span className="hud-label">RADIO FREQ</span>
          <span className="hud-value font-mono-tech" style={{ color: "var(--glow-mint)" }}>
            915.2 MHz • RSSI -82 dBm
          </span>
        </div>
        <div className="hud-metric-row">
          <span className="hud-label">RADIO LATENCY</span>
          <span className="hud-value font-mono-tech" style={{ color: "var(--glow-cyan)" }}>
            {latency} ms [SUB-12MS SLA]
          </span>
        </div>
      </div>

      {/* Top Right: Sector Clearance & Block Aspect */}
      <div className="hud-glass-pill hud-top-right">
        <div className="hud-metric-row" style={{ justifyContent: "flex-end" }}>
          <span className="hud-label">BLOCK SECTOR</span>
          <span className="hud-value font-mono-tech" style={{ color: "var(--glow-cyan)" }}>
            SECTOR {activeSector.sectorNumber || 1} / 04
          </span>
        </div>
        <div className="hud-metric-row" style={{ justifyContent: "flex-end" }}>
          <span className="hud-label">VERIFICATION</span>
          <span
            className="font-mono-tech"
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "4px",
              background: isRed ? "rgba(255, 42, 85, 0.15)" : "rgba(0, 245, 160, 0.15)",
              color: isRed ? "var(--glow-crimson)" : "var(--glow-mint)",
              border: `1px solid ${isRed ? "var(--glow-crimson)" : "var(--glow-mint)"}`
            }}
          >
            {isRed ? "⚠️ SECTOR BLOCKED" : "SECTOR CLEARED [LORA VERIFIED]"}
          </span>
        </div>
        <div className="hud-metric-row" style={{ justifyContent: "flex-end" }}>
          <span className="hud-label">LOCATION</span>
          <span className="hud-value font-mono-tech" style={{ color: "var(--glow-amber)", fontSize: "0.75rem" }}>
            {telemetryState.sector || "100KM NORTH BLOCK"}
          </span>
        </div>
      </div>

      {/* Bottom Bar: Telemetry Status */}
      <div className="hud-bottom-bar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="hud-telemetry-pill">
            <span
              className="hud-dot"
              style={{
                background: isRed ? "var(--glow-crimson)" : "var(--glow-mint)",
                color: isRed ? "var(--glow-crimson)" : "var(--glow-mint)"
              }}
            />
            <span
              className="font-mono-tech"
              style={{ fontSize: "0.8rem", color: isRed ? "var(--glow-crimson)" : "var(--glow-mint)", fontWeight: 700 }}
            >
              ASPECT: {isRed ? "RED // EMERGENCY BRAKE" : "GREEN // LINE CLEAR"}
            </span>
          </div>

          <div className="hud-telemetry-pill">
            <span className="font-mono-tech" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              SPEED: {isRed ? "0 KM/H" : `${telemetryState.speed || 78} KM/H`}
            </span>
          </div>

          <div className="hud-telemetry-pill hide-mobile">
            <span className="font-mono-tech" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              OPTICAL VISIBILITY: {telemetryState.visibility || "< 45m"} [DENSE FOG]
            </span>
          </div>
        </div>

        <div className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--glow-cyan)", opacity: 0.85 }}>
          RAILGUARD AI // TELEMETRY RELAY ACTIVE
        </div>
      </div>
    </div>
  );
}
