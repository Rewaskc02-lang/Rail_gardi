import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, Radio, Shield, Cpu, Zap, Activity } from "lucide-react";

const TOTAL_FRAMES = 240;

/**
 * TrainScroll — Ultra-Luxurious 60FPS Scrollytelling Engine
 * Streams 240 train sequence frames and binds canvas playback
 * to spring-damped inertial scroll progress with timed Framer Motion story beats.
 */
export default function TrainScroll({ telemetry }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imagesRef = useRef([]);
  const activeFrameRef = useRef(-1);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // 1. Framer Motion Scroll Progress & Inertial Spring
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Story Beat Transform Opacities & Transforms
  const heroOpacity = useTransform(smoothProgress, [0, 0.12, 0.16], [1, 1, 0]);
  const heroY = useTransform(smoothProgress, [0, 0.15], [0, -40]);
  const heroPointer = useTransform(smoothProgress, (v) => (v < 0.15 ? "auto" : "none"));

  const beat1Opacity = useTransform(smoothProgress, [0.18, 0.25, 0.42, 0.48], [0, 1, 1, 0]);
  const beat1X = useTransform(smoothProgress, [0.18, 0.25, 0.42, 0.48], [-40, 0, 0, -40]);
  const beat1Pointer = useTransform(smoothProgress, (v) => (v >= 0.18 && v <= 0.48 ? "auto" : "none"));

  const beat2Opacity = useTransform(smoothProgress, [0.50, 0.58, 0.74, 0.80], [0, 1, 1, 0]);
  const beat2X = useTransform(smoothProgress, [0.50, 0.58, 0.74, 0.80], [40, 0, 0, 40]);
  const beat2Pointer = useTransform(smoothProgress, (v) => (v >= 0.50 && v <= 0.80 ? "auto" : "none"));

  const ctaOpacity = useTransform(smoothProgress, [0.82, 0.89, 1.0], [0, 1, 1]);
  const ctaY = useTransform(smoothProgress, [0.82, 0.89, 1.0], [40, 0, 0]);
  const ctaPointer = useTransform(smoothProgress, (v) => (v >= 0.82 ? "auto" : "none"));

  // 2. High-Performance Frame Preloader
  useEffect(() => {
    let mounted = true;
    const loadedImages = new Array(TOTAL_FRAMES);
    imagesRef.current = loadedImages;
    let count = 0;

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const paddedIndex = String(i).padStart(5, "0");
      img.src = `/frames/${paddedIndex}.jpg`;

      img.onload = () => {
        if (!mounted) return;
        count++;
        setLoadedCount(count);
        if (i === 1) setIsReady(true);
      };

      img.onerror = () => {
        if (!mounted) return;
        count++;
        setLoadedCount(count);
        if (i === 1) setIsReady(true);
      };

      loadedImages[i - 1] = img;
    }

    return () => {
      mounted = false;
    };
  }, []);

  // 3. Aspect-Ratio-Preserving Contain Draw Function
  const renderFrame = useCallback((frameIdx) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imagesRef.current[frameIdx];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;

    // Deep Obsidian Dark Void Background fill
    ctx.fillStyle = "#06090e";
    ctx.fillRect(0, 0, cw, ch);

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = cw / ch;

    let drawW, drawH, drawX, drawY;

    if (canvasRatio > imgRatio) {
      // Screen is wider than image
      drawH = ch;
      drawW = ch * imgRatio;
      drawX = (cw - drawW) / 2;
      drawY = 0;
    } else {
      // Screen is taller than image
      drawW = cw;
      drawH = cw / imgRatio;
      drawX = 0;
      drawY = (ch - drawH) / 2;
    }

    ctx.save();
    ctx.filter = "blur(24px) brightness(0.4) saturate(0.85)";
    const backdropScale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const backdropW = img.naturalWidth * backdropScale;
    const backdropH = img.naturalHeight * backdropScale;
    ctx.drawImage(img, (cw - backdropW) / 2, (ch - backdropH) / 2, backdropW, backdropH);
    ctx.restore();

    const maxScale = 1.08;
    const sourceScale = Math.min(maxScale, drawW / img.naturalWidth, drawH / img.naturalHeight);
    const crispW = img.naturalWidth * sourceScale;
    const crispH = img.naturalHeight * sourceScale;
    ctx.drawImage(img, (cw - crispW) / 2, (ch - crispH) / 2, crispW, crispH);
  }, []);

  // 4. HiDPI Canvas Resize Synchronizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleResize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
      }

      if (activeFrameRef.current >= 0) {
        renderFrame(activeFrameRef.current);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderFrame]);

  // 5. Frame Sync Animation Loop via spring progress
  useEffect(() => {
    if (!isReady) return;

    activeFrameRef.current = 0;
    renderFrame(0);

    const unsubscribe = smoothProgress.on("change", (latest) => {
      const targetIndex = Math.min(
        TOTAL_FRAMES - 1,
        Math.max(0, Math.floor(latest * TOTAL_FRAMES))
      );

      if (targetIndex !== activeFrameRef.current) {
        activeFrameRef.current = targetIndex;
        requestAnimationFrame(() => renderFrame(targetIndex));
      }
    });

    return () => unsubscribe();
  }, [isReady, smoothProgress, renderFrame]);

  const loadPercent = Math.min(100, Math.floor((loadedCount / TOTAL_FRAMES) * 100));

  return (
    <div ref={containerRef} className="train-scroll" style={{ height: "420vh", position: "relative" }}>
      {/* Preloading Screen */}
      {!isReady && (
        <div style={{ position: "fixed", inset: 0, zIndex: 150, display: "grid", placeContent: "center", justifyItems: "center", gap: 16, background: "rgba(6, 9, 14, 0.95)", color: "#FFF" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--glow-cyan)", fontSize: "0.85rem", letterSpacing: "0.08em" }}>
            <Activity className="loader-icon" style={{ width: 22, height: 22 }} />
            <span className="font-mono-tech">
              RAILGUARD TELEMETRY STREAM
            </span>
          </div>

          <div style={{ width: 280, height: 6, border: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.06)", borderRadius: 20, overflow: "hidden" }}>
            <div
              style={{ width: `${loadPercent}%`, height: "100%", background: "linear-gradient(90deg, var(--glow-mint), var(--glow-cyan))", transition: "width 0.2s ease" }}
            />
          </div>

          <span className="font-mono-tech" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
            Calibrating Volumetric Fog & Train Canvas Assets... [{loadPercent}%]
          </span>
        </div>
      )}

      {/* Sticky Viewport Stage */}
      <div style={{ height: "100vh", position: "sticky", top: 0, overflow: "hidden", display: "grid", placeItems: "center", background: "#06090e" }}>
        {/* Hardware Rendered Scrollytelling Canvas */}
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />

        {/* Floating Spatial Micro-Status Pill */}
        <div
          className="font-mono-tech"
          style={{
            position: "absolute",
            zIndex: 4,
            top: 86,
            right: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            borderRadius: 20,
            background: "rgba(10, 15, 29, 0.85)",
            border: "1px solid var(--border-subtle)",
            fontSize: "0.7rem",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            backdropFilter: "blur(12px)"
          }}
        >
          <span className="status-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--glow-mint)", boxShadow: "0 0 10px var(--glow-mint)" }} />
          <span style={{ color: "var(--glow-mint)", fontWeight: 700 }}>LORA 433MHz ACTIVE</span>
          <span style={{ color: "var(--text-muted)" }}>|</span>
          <span style={{ color: "var(--text-secondary)" }}>
            SECTOR: <span style={{ color: "#FFF" }}>{telemetry?.sector || "100KM NORTH"}</span>
          </span>
          <span style={{ color: "var(--text-muted)" }}>|</span>
          <span style={{ color: "var(--glow-cyan)" }}>&lt; 12ms</span>
        </div>

        {/* =========================================================================
            TIMED STORY OVERLAYS (FRAMER MOTION TEXT BEATS)
            ========================================================================= */}

        {/* BEAT 0: 0% – 15% Scroll (Centered Hero) */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY, pointerEvents: heroPointer }}
          className="story story-hero"
        >
          <div className="story-kicker font-mono-tech">
            <Radio style={{ width: 16, height: 16 }} />
            <span>⚡ ZERO-OPTICAL CAB SIGNALING</span>
          </div>

          <h1>
            Sight Fails in Fog. <br />
            <span className="story-gradient">
              Physics Doesn’t.
            </span>
          </h1>

          <p>
            Wireless aspect telemetry delivered straight into the locomotive cab up to 3.5 km ahead of optical light signals.
          </p>

          <div className="scroll-hint font-mono-tech">
            <span>↓</span>
            <span>SCROLL TO ADVANCE TRAIN THROUGH 100KM FOG CORRIDOR</span>
          </div>
        </motion.div>

        {/* BEAT 1: 20% – 45% Scroll (Left Aligned) */}
        <motion.div
          style={{ opacity: beat1Opacity, x: beat1X, pointerEvents: beat1Pointer }}
          className="story story-left"
        >
          <div className="story-card glass-panel" style={{ padding: 28, maxWidth: 540 }}>
            <div className="story-label font-mono-tech" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--glow-cyan)", fontSize: "0.75rem", marginBottom: 12 }}>
              <Zap style={{ width: 16, height: 16 }} />
              <span>01 // THE VISIBILITY GAP</span>
            </div>

            <h2>
              Bridging the 95% Dark Zone
            </h2>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.65, marginTop: 10 }}>
              Optical visibility drops below 35m in dense winter fog corridors. RailGuard sub-GHz LoRa broadcasts aspect status at sub-12ms latency without multi-billion rupee cable trenching.
            </p>

            <div className="story-metrics font-mono-tech" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
              <div style={{ padding: 14, borderRadius: 10, background: "rgba(255, 42, 85, 0.12)", border: "1px solid rgba(255, 42, 85, 0.35)", color: "#ffa4b2" }}>
                <div style={{ fontSize: "0.68rem" }}>OPTICAL SIGHT</div>
                <strong style={{ fontSize: "1.3rem", display: "block", color: "var(--glow-crimson)", margin: "4px 0" }}>&lt; 35m</strong>
                <small style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>4.2s - 8.5s visual lag</small>
              </div>
              <div style={{ padding: 14, borderRadius: 10, background: "rgba(0, 245, 160, 0.12)", border: "1px solid rgba(0, 245, 160, 0.35)", color: "var(--glow-mint)" }}>
                <div style={{ fontSize: "0.68rem" }}>LORA RELAY</div>
                <strong style={{ fontSize: "1.3rem", display: "block", color: "var(--glow-mint)", margin: "4px 0" }}>&gt; 3.5 km</strong>
                <small style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>&lt; 12ms radio latency</small>
              </div>
            </div>
          </div>
        </motion.div>

        {/* BEAT 2: 50% – 75% Scroll (Right Aligned) */}
        <motion.div
          style={{ opacity: beat2Opacity, x: beat2X, pointerEvents: beat2Pointer }}
          className="story story-right"
        >
          <div className="story-card glass-panel" style={{ padding: 28, maxWidth: 540 }}>
            <div className="story-label font-mono-tech" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--glow-mint)", fontSize: "0.75rem", marginBottom: 12 }}>
              <Cpu style={{ width: 16, height: 16 }} />
              <span>02 // EDGE & AI TOPOLOGY</span>
            </div>

            <h2>
              Micro-ATP + Agentic Triage
            </h2>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.65, marginTop: 10 }}>
              Trackside battery-clamped ESP32 nodes stream aspect lights to cab HUDs, while RailGuard AI resolves cascading sector delays at loop sidings with B2B freight SLA protection.
            </p>

            <div className="story-tags font-mono-tech" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <span style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0, 216, 246, 0.12)", border: "1px solid rgba(0, 216, 246, 0.3)", color: "var(--glow-cyan)", fontSize: "0.72rem" }}>
                ESP32 Solar Clamps
              </span>
              <span style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(0, 245, 160, 0.12)", border: "1px solid rgba(0, 245, 160, 0.3)", color: "var(--glow-mint)", fontSize: "0.72rem" }}>
                Gemini 3.7 AI Triage
              </span>
            </div>
          </div>
        </motion.div>

        {/* BEAT 3: 85% – 100% Scroll (Centered Operations Launch CTA) */}
        <motion.div
          style={{ opacity: ctaOpacity, y: ctaY, pointerEvents: ctaPointer }}
          className="story story-cta"
        >
          <div className="story-kicker font-mono-tech">
            <Shield style={{ width: 16, height: 16 }} />
            <span>03 // UNIFIED REAL-TIME BUS</span>
          </div>

          <h2>
            System Locked & Transmitting.
          </h2>

          <p style={{ maxWidth: 620 }}>
            Launch the unified operations console to monitor live passenger manifests, pilot signals, and AI dispatch.
          </p>

          <div className="story-actions" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 24, pointerEvents: "auto" }}>
            <Link
              to="/pilot"
              className="btn-spatial btn-spatial-cyan"
              style={{ textDecoration: "none", padding: "14px 22px", borderRadius: 24 }}
            >
              <span>Loco-Pilot HUD</span>
              <ArrowUpRight style={{ width: 16, height: 16 }} />
            </Link>

            <Link
              to="/tt"
              className="btn-spatial btn-spatial-mint"
              style={{ textDecoration: "none", padding: "14px 22px", borderRadius: 24 }}
            >
              <span>TT Manifest Matrix</span>
              <ArrowUpRight style={{ width: 16, height: 16 }} />
            </Link>

            <Link
              to="/occ"
              className="btn-spatial btn-spatial-cyan"
              style={{ textDecoration: "none", padding: "14px 22px", borderRadius: 24 }}
            >
              <span>OCC SLA Arbitrator</span>
              <ArrowUpRight style={{ width: 16, height: 16 }} />
            </Link>

            <Link
              to="/passenger"
              className="btn-spatial"
              style={{ textDecoration: "none", padding: "14px 22px", borderRadius: 24, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#FFF" }}
            >
              <span>Passenger Portal</span>
              <ArrowUpRight style={{ width: 16, height: 16 }} />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
