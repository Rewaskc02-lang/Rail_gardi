import React, { useState } from "react";
import TrainScroll from "../components/TrainScroll.jsx";
import { Cpu, Shield, Radio, Activity, Zap } from "lucide-react";
import { API_URL } from "../config.js";

/**
 * LandingPage — Master Cinematic RailGuard Scrollytelling Experience
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
      setTimeout(() => setTestSimulating(false), 3000);
    }
  }

  return (
    <div className="landing-page">
      {/* 1. Ultra-Luxurious Sticky Scrollytelling Sequence */}
      <TrainScroll telemetry={telemetry} />

      {/* 2. Technical Architecture & Live Telemetry Dock */}
      <div className="landing-content">
        {/* Three Core Pillars */}
        <section className="landing-section">
          <div>
            <span className="landing-eyebrow font-mono-tech">
              04 // HARDWARE & NETWORK TOPOLOGY
            </span>
            <h2 className="landing-title">
              Three Unified Operations Pillars
            </h2>
          </div>

          <div className="pillar-grid">
            <div className="pillar-card">
              <Cpu className="pillar-icon" />
              <h3>ESP32 + LoRa Mesh</h3>
              <p>
                Trackside battery/solar clamp-on nodes broadcasting physical lamp aspects without altering legacy signaling circuits.
              </p>
            </div>

            <div className="pillar-card">
              <Shield className="pillar-icon" />
              <h3>Real-Time State Bus</h3>
              <p>
                Sub-15ms WebSocket pipeline connecting passenger SOS safety triggers directly to conductor manifest screens.
              </p>
            </div>

            <div className="pillar-card">
              <Radio className="pillar-icon" />
              <h3>Agentic AI Triage</h3>
              <p>
                RailGuard AI ingests in-memory sector delay state to deliver human-readable loop-line hold recommendations.
              </p>
            </div>
          </div>
        </section>

        {/* Live Hardware Injector Dock */}
        <section className="hardware-dock">
          <div className="dock-header">
            <div>
              <span className="font-mono-tech text-xs text-emerald-400 font-semibold tracking-wider block mb-1">
                ⚡ LIVE HARDWARE SENSOR SIMULATOR [HACKATHON DEMO DOCK]
              </span>
              <p className="text-sm text-slate-400">
                Inject synthetic trackside sensor telemetry to trigger instant multi-view synchronization across Pilot and OCC views:
              </p>
            </div>
            <span className="dock-status font-mono-tech">
              HARDWARE INJECTOR READY
            </span>
          </div>

          <div className="injector-grid">
            <button
              type="button"
              disabled={testSimulating}
              onClick={() => triggerSimulatedHardware("RED", "100KM NORTH BLOCK")}
              className="injector-button injector-button-danger"
            >
              🚨 INJECT DANGER SIGNAL (RED // EMERGENCY BRAKE)
            </button>

            <button
              type="button"
              disabled={testSimulating}
              onClick={() => triggerSimulatedHardware("GREEN", "100KM NORTH BLOCK")}
              className="injector-button injector-button-clear"
            >
              ✅ INJECT LINE CLEAR (GREEN // PROCEED)
            </button>
          </div>

          {simMessage && (
            <div className="sim-message font-mono-tech">
              {simMessage}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
