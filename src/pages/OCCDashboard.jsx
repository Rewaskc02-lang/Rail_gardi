import React, { useState, useCallback } from "react";
import socket from "../socket.js";

const TRAIN_OPTIONS = [
  { id: "F99", label: "F99 — Apollo Pharma Freight (SLA: 20 min max)" },
];

export default function OCCDashboard() {
  const [selectedTrain, setSelectedTrain] = useState("F99");
  const [delayMins, setDelayMins] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);

  // Warning modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [warningData, setWarningData] = useState(null);
  const [aiResolution, setAiResolution] = useState(null);

  const handleIssueCommand = useCallback(() => {
    setWarningData(null);
    setAiResolution(null);
    setIsProcessing(true);

    // Wire listeners BEFORE emitting so we never miss the response
    socket.once("negotiation_mismatch_warning", (data) => {
      setWarningData(data);
      setModalOpen(true);
      if (!data.warning) {
        // Approved — no AI follow-up expected
        setIsProcessing(false);
      }
    });

    socket.once("ai_resolution_ready", (data) => {
      setAiResolution(data);
      setIsProcessing(false);
    });

    socket.emit("issue_operator_command", {
      trainId: selectedTrain,
      durationMins: delayMins,
    });
  }, [selectedTrain, delayMins]);

  const closeModal = () => {
    setModalOpen(false);
    setWarningData(null);
    setAiResolution(null);
    setIsProcessing(false);
    // Clean up any dangling listeners
    socket.off("negotiation_mismatch_warning");
    socket.off("ai_resolution_ready");
  };

  const isBreached = warningData?.warning != null;

  return (
    <div style={{ maxWidth: 920, margin: "38px auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: "22px 26px" }}>
        <div className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--glow-mint)", letterSpacing: "0.1em" }}>
          🚛 FREIGHT CORRIDOR — OPERATOR CONTROL CENTER
        </div>
        <h2 style={{ fontSize: "1.35rem", marginTop: 4 }}>B2B SLA Arbitrator Console</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginTop: 4 }}>
          Challenge #697 — Issue routing commands against freight trains with recorded SLA context. Delays exceeding contract thresholds are intercepted and blocked.
        </p>
      </div>

      {/* Command Panel */}
      <div className="glass-panel" style={{ padding: 26, borderLeft: "4px solid var(--glow-mint)" }}>
        <div className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 16, letterSpacing: "0.06em" }}>
          ISSUE OPERATOR ROUTING COMMAND
        </div>

        {/* Train Selector */}
        <label htmlFor="occ-train-select" className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
          TARGET TRAIN
        </label>
        <select
          id="occ-train-select"
          className="form-input-spatial"
          value={selectedTrain}
          onChange={(e) => setSelectedTrain(e.target.value)}
        >
          {TRAIN_OPTIONS.map((t) => (
            <option key={t.id} value={t.id} style={{ background: "#080e18", color: "#FFF" }}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Delay Slider */}
        <div style={{ marginTop: 22 }}>
          <label htmlFor="occ-delay-slider" className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
            HOLD DELAY: <strong style={{ color: delayMins > 20 ? "var(--glow-crimson)" : "var(--glow-mint)", fontSize: "1.1rem" }}>{delayMins} MIN</strong>
            {delayMins > 20 && (
              <span style={{ color: "var(--glow-crimson)", marginLeft: 10, fontWeight: 700 }}>
                ⚠ EXCEEDS SLA THRESHOLD
              </span>
            )}
          </label>
          <input
            id="occ-delay-slider"
            type="range"
            min={0}
            max={60}
            step={1}
            value={delayMins}
            onChange={(e) => setDelayMins(Number(e.target.value))}
            style={{
              width: "100%",
              accentColor: delayMins > 20 ? "#9b5151" : "#aeae46",
              height: 8,
            }}
          />
          <div className="font-mono-tech" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 4 }}>
            <span>0 MIN</span>
            <span style={{ color: "var(--glow-crimson)", fontWeight: 700 }}>MAX SLA: 20 MIN</span>
            <span>60 MIN</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          id="occ-issue-cmd-btn"
          type="button"
          className={`btn-spatial ${delayMins > 20 ? "btn-spatial-crimson" : "btn-spatial-mint"}`}
          style={{ width: "100%", padding: 16, marginTop: 22, fontSize: "0.85rem" }}
          onClick={handleIssueCommand}
          disabled={isProcessing}
        >
          {isProcessing ? "⏳ ARBITRATING..." : `ISSUE ROUTING COMMAND — ${delayMins} MIN HOLD ON ${selectedTrain}`}
        </button>
      </div>

      {/* Mismatch Warning / Resolution Modal Overlay */}
      {modalOpen && warningData && (
        <div
          id="occ-arbitration-modal"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(6px)",
            padding: 20,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 960,
              maxHeight: "90vh",
              overflow: "auto",
              background: isBreached ? "rgba(40, 12, 12, 0.97)" : "rgba(12, 40, 12, 0.97)",
              border: `2px solid ${isBreached ? "#9b5151" : "#5a8a46"}`,
              borderRadius: 18,
              boxShadow: isBreached
                ? "0 0 60px rgba(155,81,81,0.35), 0 0 120px rgba(155,81,81,0.12)"
                : "0 0 60px rgba(90,138,70,0.35)",
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "22px 28px",
              borderBottom: `1px solid ${isBreached ? "rgba(155,81,81,0.4)" : "rgba(90,138,70,0.4)"}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <span className="font-mono-tech" style={{
                  fontSize: "0.7rem",
                  letterSpacing: "0.1em",
                  color: isBreached ? "#ff6b6b" : "#7dde6b",
                }}>
                  {isBreached ? "🚨 NEGOTIATION MISMATCH WARNING" : "✅ COMMAND APPROVED"}
                </span>
                <h3 style={{ color: "#fff", fontSize: "1.2rem", marginTop: 4 }}>
                  {isBreached ? "SLA Breach Detected — Action Blocked" : "Delay Within SLA Threshold"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  color: "#fff",
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                }}
              >
                CLOSE ✕
              </button>
            </div>

            {/* Modal Body — Split Layout */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isBreached ? "1fr 1fr" : "1fr",
              gap: 0,
            }}>
              {/* Left: Warning Text */}
              {isBreached && (
                <div style={{ padding: 28, borderRight: "1px solid rgba(155,81,81,0.3)" }}>
                  <div className="font-mono-tech" style={{ fontSize: "0.68rem", color: "#ff9999", letterSpacing: "0.06em", marginBottom: 12 }}>
                    ARBITRATION VERDICT
                  </div>
                  <p style={{ color: "#ffd4d4", fontSize: "0.95rem", lineHeight: 1.7 }}>
                    {warningData.warning}
                  </p>

                  {/* Penalty Callout */}
                  {warningData.exposed_state?.arbitration_result && (
                    <div style={{
                      marginTop: 20,
                      padding: "16px 18px",
                      background: "rgba(155,81,81,0.25)",
                      border: "1px solid rgba(155,81,81,0.5)",
                      borderRadius: 10,
                    }}>
                      <div className="font-mono-tech" style={{ fontSize: "0.68rem", color: "#ff9999", marginBottom: 8 }}>
                        FINANCIAL IMPACT
                      </div>
                      <div style={{ color: "#ff6b6b", fontSize: "2rem", fontWeight: 800, fontFamily: "var(--font-heading)" }}>
                        {warningData.exposed_state.arbitration_result.penalty_formatted}
                      </div>
                      <div className="font-mono-tech" style={{ fontSize: "0.72rem", color: "#ff9999", marginTop: 4 }}>
                        {warningData.exposed_state.arbitration_result.excess_mins} min excess × ₹{warningData.exposed_state.recorded_context?.penalty_per_min?.toLocaleString("en-IN")}/min
                      </div>
                    </div>
                  )}

                  {/* AI Resolution Box */}
                  {aiResolution && (
                    <div style={{
                      marginTop: 20,
                      padding: "16px 18px",
                      background: "rgba(90,138,70,0.2)",
                      border: "1px solid rgba(90,138,70,0.5)",
                      borderRadius: 10,
                    }}>
                      <div className="font-mono-tech" style={{ fontSize: "0.68rem", color: "#7dde6b", letterSpacing: "0.06em", marginBottom: 8 }}>
                        ✅ AI RESOLUTION READY
                      </div>
                      <p style={{ color: "#c8f5c0", fontSize: "0.88rem", lineHeight: 1.65 }}>
                        {aiResolution.resolution}
                      </p>
                      {aiResolution.suggested_route && (
                        <div className="font-mono-tech" style={{ marginTop: 10, fontSize: "0.72rem", color: "#a0dda0" }}>
                          VIA: {aiResolution.suggested_route.via} • +{aiResolution.suggested_route.added_transit_mins} min • PENALTY: ₹0
                        </div>
                      )}
                    </div>
                  )}
                  {isProcessing && !aiResolution && (
                    <div className="font-mono-tech" style={{ marginTop: 20, color: "#ff9999", fontSize: "0.78rem" }}>
                      ⏳ AI resolution engine processing... (≈2.5s)
                    </div>
                  )}
                </div>
              )}

              {/* Right: Raw JSON State — CRITICAL CHALLENGE REQUIREMENT */}
              <div style={{ padding: 28, background: isBreached ? "rgba(0,0,0,0.3)" : "transparent" }}>
                <div className="font-mono-tech" style={{
                  fontSize: "0.68rem",
                  color: isBreached ? "#ff9999" : "#7dde6b",
                  letterSpacing: "0.06em",
                  marginBottom: 12,
                }}>
                  📋 EXPOSED STATE — RAW JSON (JUDGE VERIFICATION)
                </div>
                <pre
                  id="occ-exposed-state-json"
                  style={{
                    background: "#0d0d0d",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "18px 20px",
                    margin: 0,
                    overflowX: "auto",
                    maxHeight: 480,
                    fontSize: "0.78rem",
                    lineHeight: 1.6,
                  }}
                >
                  <code style={{ color: "#e0e0e0", fontFamily: "var(--font-mono)" }}>
                    {JSON.stringify(warningData.exposed_state, null, 2)}
                  </code>
                </pre>

                {/* AI Resolution JSON (if available) */}
                {aiResolution && (
                  <>
                    <div className="font-mono-tech" style={{ fontSize: "0.68rem", color: "#7dde6b", letterSpacing: "0.06em", marginTop: 20, marginBottom: 12 }}>
                      🤖 AI RESOLUTION PAYLOAD
                    </div>
                    <pre
                      id="occ-ai-resolution-json"
                      style={{
                        background: "#0a1a0a",
                        border: "1px solid rgba(90,138,70,0.35)",
                        borderRadius: 10,
                        padding: "18px 20px",
                        margin: 0,
                        overflowX: "auto",
                        maxHeight: 300,
                        fontSize: "0.78rem",
                        lineHeight: 1.6,
                      }}
                    >
                      <code style={{ color: "#c8f5c0", fontFamily: "var(--font-mono)" }}>
                        {JSON.stringify(aiResolution, null, 2)}
                      </code>
                    </pre>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
