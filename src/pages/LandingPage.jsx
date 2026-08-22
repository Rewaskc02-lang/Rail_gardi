import React, { useState } from "react";
import TrainScroll from "../components/TrainScroll.jsx";
import { Cpu, Shield, Radio, Activity, Zap, CheckCircle2, AlertTriangle } from "lucide-react";
import { API_URL } from "../config.js";

/**
 * LandingPage — Master Cinematic RailGuard Scrollytelling Experience
 * Combines 240-frame hardware-rendered train canvas with live telemetry docks.
 */
export default function LandingPage({ telemetry }) {
  const [testSimulating, setTestSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState("");

  async function triggerSimulatedHardware(signal, zone) {
    setTestSimulating(true);
    setSimMessage(`Transmitting ${signal} aspect over 433MHz LoRa Mesh...`);
    try {
      const res = await fetch(`${API_URL}/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalState: signal,
          signal,
          speed: signal === "RED" ? 0 : 78,
          sector: zone || "100KM NORTH BLOCK",
          visibility: "< 35m"
        })
      });
      if (res.ok) {
        setSimMessage(`✓ LoRa Broadcast Verified: Aspect ${signal} active in ${zone || "100KM NORTH BLOCK"}`);
      }
    } catch (err) {
      setSimMessage("⚠️ Simulation broadcast: Local fallback mode active.");
    } finally {
      setTimeout(() => setTestSimulating(false), 3200);
    }
  }

  return (
    <div className="landing-page">
      {/* 1. Ultra-Luxurious Sticky Scrollytelling Sequence */}
      <TrainScroll telemetry={telemetry} />

      {/* 2. Technical Architecture & Live Telemetry Dock */}
      <div className="landing-content" style={{ maxWidth: 1120, margin: "0 auto", padding: "80px 24px 140px" }}>
        {/* Three Core Pillars */}
        <section className="landing-section" style={{ marginBottom: 64 }}>
          <div style={{ marginBottom: 32 }}>
            <span className="font-mono-tech glow-text-cyan" style={{ fontSize: "0.75rem", letterSpacing: "0.12em" }}>
              04 // HARDWARE & NETWORK TOPOLOGY
            </span>
            <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", marginTop: 6 }}>
              Three Unified Operations Pillars
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem", marginTop: 6, maxWidth: 680 }}>
              Zero-optical railway architecture designed to eliminate collision risk and dispatch friction across dense fog corridors.
            </p>
          </div>

          <div className="pillar-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            <div className="glass-panel" style={{ padding: 28 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(250, 237, 38, 0.12)", border: "1px solid rgba(250, 237, 38, 0.32)", display: "grid", placeItems: "center", marginBottom: 18 }}>
                <Cpu style={{ width: 22, height: 22, color: "var(--glow-cyan)" }} />
              </div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: 8 }}>ESP32 + LoRa Mesh</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.65 }}>
                Trackside battery/solar clamp-on nodes broadcasting physical lamp aspects directly to loco-cabs without altering legacy signaling circuits.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: 28 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(0, 245, 155, 0.12)", border: "1px solid rgba(0, 245, 155, 0.30)", display: "grid", placeItems: "center", marginBottom: 18 }}>
                <Shield style={{ width: 22, height: 22, color: "var(--glow-mint)" }} />
              </div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: 8 }}>Real-Time State Bus</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.65 }}>
                Sub-15ms WebSocket pipeline connecting passenger emergency SOS triggers, seat swaps, and catering manifests directly to TTE screens.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: 28 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(212, 139, 112, 0.14)", border: "1px solid rgba(212, 139, 112, 0.32)", display: "grid", placeItems: "center", marginBottom: 18 }}>
                <Radio style={{ width: 22, height: 22, color: "var(--glow-amber)" }} />
              </div>
              <h3 style={{ fontSize: "1.2rem", marginBottom: 8 }}>Agentic AI Triage</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.65 }}>
                RailGuard AI ingests in-memory sector delay and freight SLA context to deliver legally vetted loop-line hold recommendations.
              </p>
            </div>
          </div>
        </section>

        {/* Live Hardware Injector Dock */}
        <section className="glass-panel" style={{ padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
            <div>
              <span className="font-mono-tech glow-text-mint" style={{ fontSize: "0.75rem", letterSpacing: "0.08em", display: "block", marginBottom: 4 }}>
                ⚡ LIVE HARDWARE SENSOR SIMULATOR [HACKATHON DEMO DOCK]
              </span>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: 640 }}>
                Inject synthetic trackside sensor telemetry to trigger instant multi-view synchronization across Pilot HUD, OCC Arbitrator, and Conductor views:
              </p>
            </div>
            <span className="status-badge-spatial claimed font-mono-tech">
              HARDWARE INJECTOR READY
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
            <button
              type="button"
              disabled={testSimulating}
              onClick={() => triggerSimulatedHardware("RED", "100KM NORTH BLOCK")}
              className="btn-spatial btn-spatial-crimson"
              style={{ padding: 16 }}
            >
              <AlertTriangle style={{ width: 18, height: 18 }} />
              <span>INJECT DANGER SIGNAL (RED // EMERGENCY BRAKE)</span>
            </button>

            <button
              type="button"
              disabled={testSimulating}
              onClick={() => triggerSimulatedHardware("GREEN", "100KM NORTH BLOCK")}
              className="btn-spatial btn-spatial-mint"
              style={{ padding: 16 }}
            >
              <CheckCircle2 style={{ width: 18, height: 18 }} />
              <span>INJECT LINE CLEAR (GREEN // PROCEED)</span>
            </button>
          </div>

          {simMessage && (
            <div
              className="font-mono-tech"
              style={{
                marginTop: 18,
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgba(250, 237, 38, 0.08)",
                border: "1px solid rgba(250, 237, 38, 0.30)",
                color: "var(--glow-mint)",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}
            >
              <Activity style={{ width: 16, height: 16 }} />
              <span>{simMessage}</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
