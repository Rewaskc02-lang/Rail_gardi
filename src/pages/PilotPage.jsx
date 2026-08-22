import React, { useState, useEffect, useRef } from "react";
import socket from "../socket.js";
import { API_URL } from "../config.js";

export default function PilotPage() {
  const [telemetry, setTelemetry] = useState({
    speed: 78,
    visibility: "< 45m",
    signalState: "GREEN",
    signal: "GREEN",
    sector: "100KM NORTH BLOCK",
    zone: "Fog Zone 3 - Northern Corridor",
    timestamp: "12:00:00"
  });

  const [rawAiAdvice, setRawAiAdvice] = useState(
    "Track sector clear. Normal line speed authorized. Maintain 433MHz LoRa link."
  );
  const [displayedAdvice, setDisplayedAdvice] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [simStatus, setSimStatus] = useState("");
  const typewriterTimerRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setDisplayedAdvice(rawAiAdvice);
      setIsTyping(false);
      return;
    }

    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current);
    }

    setDisplayedAdvice("");
    setIsTyping(true);
    let index = 0;
    const fullText = rawAiAdvice;

    typewriterTimerRef.current = setInterval(() => {
      index++;
      setDisplayedAdvice(fullText.slice(0, index));
      if (index >= fullText.length) {
        clearInterval(typewriterTimerRef.current);
        setIsTyping(false);
      }
    }, 18);

    return () => {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current);
      }
    };
  }, [rawAiAdvice]);

  useEffect(() => {
    function handleStateUpdate(fullState) {
      if (fullState) {
        if (fullState.telemetry) {
          setTelemetry((prev) => ({
            ...prev,
            ...fullState.telemetry,
            signalState: fullState.telemetry.signalState || fullState.telemetry.signal || "GREEN"
          }));
        }
        if (fullState.aiAdvice) {
          const adviceText = typeof fullState.aiAdvice === "object" ? fullState.aiAdvice.text || fullState.aiAdvice.advice : fullState.aiAdvice;
          if (adviceText) setRawAiAdvice(adviceText);
        }
      }
    }

    function handleTelemetryUpdate(data) {
      if (data) {
        setTelemetry((prev) => ({
          ...prev,
          ...data,
          signalState: data.signalState || data.signal || prev.signalState
        }));
      }
    }

    function handleAiAdviceUpdate(data) {
      if (data) {
        const adviceText = typeof data === "object" ? data.text || data.advice : data;
        if (adviceText) setRawAiAdvice(adviceText);
      }
    }

    socket.on("state_update", handleStateUpdate);
    socket.on("telemetry_update", handleTelemetryUpdate);
    socket.on("ai_advice_update", handleAiAdviceUpdate);

    return () => {
      socket.off("state_update", handleStateUpdate);
      socket.off("telemetry_update", handleTelemetryUpdate);
      socket.off("ai_advice_update", handleAiAdviceUpdate);
    };
  }, []);

  async function triggerHardwareSignal(aspect) {
    setSimStatus(`Transmitting ${aspect} aspect via ESP32 LoRa Serial...`);
    try {
      await fetch(`${API_URL}/api/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signalState: aspect,
          signal: aspect,
          speed: aspect === "RED" ? 0 : 78,
          sector: "100KM NORTH BLOCK",
          visibility: "< 45m"
        })
      });
      setSimStatus(`✓ Hardware Aspect broadcast: ${aspect}`);
    } catch (err) {
      setTelemetry((prev) => ({
        ...prev,
        signalState: aspect,
        signal: aspect,
        speed: aspect === "RED" ? 0 : 78
      }));
      setSimStatus(`✓ Local simulator aspect set: ${aspect}`);
    }
    setTimeout(() => setSimStatus(""), 3000);
  }

  async function triggerAiAdviceReroute() {
    setSimStatus("Dispatching AI reroute advisory...");
    const sampleReroute = "AI REROUTE ADVICE: Dense fog detected in 100KM North Block. Track speed restricted to 45 km/h. Switch junction 4 to Loop Line 2.";
    try {
      await fetch(`${API_URL}/api/ai-advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advice: sampleReroute,
          conflictId: "REROUTE-" + Math.floor(1000 + Math.random() * 9000)
        })
      });
      setSimStatus("✓ AI reroute advisory dispatched over WebSocket");
    } catch (err) {
      setRawAiAdvice(sampleReroute);
      setSimStatus("✓ Local simulator AI advice updated");
    }
    setTimeout(() => setSimStatus(""), 3000);
  }

  const isRed = (telemetry.signalState || telemetry.signal) === "RED";

  return (
    <div className="pilot-container">
      {/* Cab Header Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="font-mono-tech" style={{ fontSize: "0.8rem", color: "var(--glow-mint)", fontWeight: 700 }}>
            🚂 CAB SIGNALING & TRACK TELEMETRY // WAP-7 #30201 [433MHz LoRa RELAY]
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "4px" }}>
            Kavach Automatic Train Protection • Sector: {telemetry.sector} • Clock: {telemetry.timestamp}
          </div>
        </div>
        <span className={`status-badge-spatial ${isRed ? "sos" : "claimed"}`}>
          {isRed ? "ALERT: EMERGENCY BRAKE" : "CAB NORMAL // PROCEED"}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px" }}>
        {/* Dominant Optical Aspect Lamp */}
        <div className={`signal-beacon-glass signal-state-${isRed ? "RED" : "GREEN"}`}>
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <span className="font-mono-tech" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>MAIN SIGNAL ASPECT</span>
            <span className="font-mono-tech" style={{ fontSize: "0.75rem", color: isRed ? "var(--glow-crimson)" : "var(--glow-mint)", fontWeight: 700 }}>
              {isRed ? "DANGER // RED" : "PROCEED // GREEN"}
            </span>
          </div>

          <div className="lamp-bezel-spatial">
            <div className="lamp-lens-spatial" />
          </div>

          <div className="signal-aspect-title">
            {isRed ? "EMERGENCY BRAKE" : "LINE CLEAR"}
          </div>

          <div style={{ fontSize: "0.95rem", color: "var(--text-secondary)", maxWidth: "340px", marginBottom: "24px" }}>
            {isRed
              ? "HALT IMMEDIATELY • OBSTRUCTION OR RED ASPECT IN BLOCK"
              : "AUTHORIZED FOR MAXIMUM SCHEDULED SPEED"}
          </div>

          {/* Telemetry Metrics Readout Grid */}
          <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)" }}>
            <div className="glass-panel" style={{ padding: "14px 16px", textAlign: "left" }}>
              <span className="font-mono-tech" style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>TRACK SIGNAL</span>
              <div className="font-mono-tech" style={{ fontSize: "1.4rem", fontWeight: 800, color: isRed ? "var(--glow-crimson)" : "var(--glow-mint)", marginTop: "2px" }}>
                {isRed ? "RED" : "GREEN"}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "14px 16px", textAlign: "left" }}>
              <span className="font-mono-tech" style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>CAB SPEED</span>
              <div className="font-mono-tech" style={{ fontSize: "1.4rem", fontWeight: 800, color: isRed ? "var(--glow-crimson)" : "var(--glow-cyan)", marginTop: "2px" }}>
                {telemetry.speed} KM/H
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "14px 16px", textAlign: "left" }}>
              <span className="font-mono-tech" style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>FOG VISIBILITY</span>
              <div className="font-mono-tech" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--glow-amber)", marginTop: "4px" }}>
                {telemetry.visibility}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "14px 16px", textAlign: "left" }}>
              <span className="font-mono-tech" style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>BLOCK SECTOR</span>
              <div className="font-mono-tech" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "6px" }}>
                {telemetry.sector}
              </div>
            </div>
          </div>
        </div>

        {/* AI Dispatch Advisory Telex & Manual Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="glass-panel" style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px dashed var(--border-subtle)" }}>
              <div>
                <span className="font-mono-tech" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  📡 AI DISPATCH ADVISORY TELEX
                </span>
                <div className="font-mono-tech" style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  MEMBER RITU (AI LEAD) INTEGRATION CHANNEL
                </div>
              </div>
              <span className="status-badge-spatial claimed">
                {isTyping ? "STREAMING..." : "FEED IDLE"}
              </span>
            </div>

            <div
              id="ai-advice-text"
              className="font-mono-tech"
              style={{
                flex: 1,
                padding: "16px",
                background: "rgba(0, 0, 0, 0.4)",
                borderRadius: "8px",
                border: `1px solid ${isRed ? "rgba(255, 42, 85, 0.35)" : "rgba(0, 245, 160, 0.25)"}`,
                color: isRed ? "var(--glow-crimson)" : "#A7F3D0",
                fontSize: "0.95rem",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                minHeight: "180px"
              }}
            >
              <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "8px" }}>
                {">>> [RAILGUARD AI TRIAGE DISPATCH]"}
              </div>
              {displayedAdvice}
              {isTyping && <span className="typewriter-cursor" />}
            </div>
          </div>

          {/* Standalone Stage Demo Injector */}
          <div className="glass-panel" style={{ padding: "20px", border: "1px solid rgba(0, 245, 160, 0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span className="font-mono-tech" style={{ fontSize: "0.8rem", color: "var(--glow-cyan)", fontWeight: 700 }}>
                ⚡ CAB DEMO CONTROLLER & SENSOR INJECTORS
              </span>
              <span className="status-badge-spatial claimed">STANDALONE READY</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                type="button"
                className="btn-spatial btn-spatial-crimson"
                onClick={() => triggerHardwareSignal("RED")}
              >
                🚨 INJECT RED SIGNAL
              </button>

              <button
                type="button"
                className="btn-spatial btn-spatial-mint"
                onClick={() => triggerHardwareSignal("GREEN")}
              >
                ✅ INJECT GREEN SIGNAL
              </button>
            </div>

            <button
              type="button"
              className="btn-spatial btn-spatial-mint"
              style={{ width: "100%", marginTop: "10px", padding: "10px" }}
              onClick={triggerAiAdviceReroute}
            >
              🤖 DISPATCH AI REROUTE ADVISORY
            </button>

            {simStatus && (
              <div className="font-mono-tech" style={{ fontSize: "0.8rem", color: "var(--glow-mint)", marginTop: "10px", textAlign: "center" }}>
                {simStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
