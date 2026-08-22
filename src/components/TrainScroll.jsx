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
        // Show the experience as soon as the opening frame is available.
        // The remaining frames continue streaming in without blocking interaction.
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

    // Deep Obsidian / Navy Fog Void Background fill
    ctx.fillStyle = "#5A5231";
    ctx.fillRect(0, 0, cw, ch);

    // Preserve the source resolution in the foreground. Low-resolution frame
    // exports are never stretched across large displays; a soft backdrop fills
    // the remaining space cleanly instead of exposing pixelation.
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
    ctx.filter = "blur(20px) brightness(0.55) saturate(0.78)";
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

    // Draw initial frame
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
    <div ref={containerRef} className="train-scroll">
      {/* Preloading Screen */}
      {!isReady && (
        <div className="train-loader">
          <div className="loader-heading">
            <Activity className="loader-icon" />
            <span className="font-mono-tech">
              RAILGUARD TELEMETRY STREAM
            </span>
          </div>

          <div className="loader-track">
            <div
              className="loader-progress"
              style={{ width: `${loadPercent}%` }}
            />
          </div>

          <span className="loader-copy font-mono-tech">
            Calibrating Volumetric Fog & Train Assets... [{loadPercent}%]
          </span>
        </div>
      )}

      {/* Sticky Viewport Anchor */}
      <div className="train-stage">
        {/* Hardware Rendered Scrollytelling Canvas */}
        <canvas ref={canvasRef} className="train-canvas" />

        {/* Floating Spatial Micro-Status Pill */}
        <div
          className="train-status font-mono-tech"
        >
          <span className="status-dot" />
          <span className="status-good">LORA 433MHz ACTIVE</span>
          <span className="status-divider">|</span>
          <span className="status-muted">
            SECTOR: <span>{telemetry?.sector || "100KM NORTH"}</span>
          </span>
          <span className="status-divider">|</span>
          <span className="status-accent">&lt; 12ms</span>
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
            <Radio />
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
          <div className="story-card">
            <div className="story-label font-mono-tech">
              <Zap />
              <span>01 // THE VISIBILITY GAP</span>
            </div>

            <h2>
              Bridging the 95% Dark Zone
            </h2>

            <p>
              Optical visibility drops below 35m in dense winter fog corridors. RailGuard sub-GHz LoRa broadcasts aspect status at sub-12ms latency without multi-billion rupee cable trenching.
            </p>

            <div className="story-metrics font-mono-tech">
              <div className="metric metric-danger">
                <div>OPTICAL SIGHT</div>
                <strong>&lt; 35m</strong>
                <small>4.2s - 8.5s visual lag</small>
              </div>
              <div className="metric metric-clear">
                <div>LORA RELAY</div>
                <strong>&gt; 3.5 km</strong>
                <small>&lt; 12ms radio latency</small>
              </div>
            </div>
          </div>
        </motion.div>

        {/* BEAT 2: 50% – 75% Scroll (Right Aligned) */}
        <motion.div
          style={{ opacity: beat2Opacity, x: beat2X, pointerEvents: beat2Pointer }}
          className="story story-right"
        >
          <div className="story-card">
            <div className="story-label font-mono-tech">
              <Cpu />
              <span>02 // EDGE & AI TOPOLOGY</span>
            </div>

            <h2>
              Micro-ATP + Agentic Triage
            </h2>

            <p>
              Trackside battery-clamped ESP32 nodes stream aspect lights to cab HUDs, while RailGuard AI resolves cascading sector delays at loop sidings.
            </p>

            <div className="story-tags font-mono-tech">
              <span>
                ESP32 Solar Clamps
              </span>
              <span>
                RailGuard AI
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
            <Shield />
            <span>03 // UNIFIED REAL-TIME BUS</span>
          </div>

          <h2>
            System Locked & Transmitting.
          </h2>

          <p>
            Launch the unified operations console to monitor live passenger manifests, pilot signals, and AI dispatch.
          </p>

          <div className="story-actions">
            <Link
              to="/pilot"
              className="story-action story-action-primary"
              style={{ textDecoration: "none" }}
            >
              <span>Loco-Pilot HUD</span>
              <ArrowUpRight />
            </Link>

            <Link
              to="/tt"
              className="story-action"
              style={{ textDecoration: "none" }}
            >
              OCC Conductor Manifest ➔
            </Link>

            <Link
              to="/passenger"
              className="story-action"
              style={{ textDecoration: "none" }}
            >
              Passenger Portal ➔
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
