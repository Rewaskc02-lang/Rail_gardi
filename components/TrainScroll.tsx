"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, Radio, Shield, Cpu, Zap, Activity } from "lucide-react";

// Universal Link component for seamless Next.js & React Router compatibility
function NavLink({ href, className, children, ...props }: { href: string; className?: string; children: React.ReactNode; [key: string]: any }) {
  return (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  );
}

const TOTAL_FRAMES = 240;

interface TrainScrollProps {
  telemetry?: {
    speed?: number;
    visibility?: string;
    signalState?: string;
    sector?: string;
  };
}

export default function TrainScroll({ telemetry }: TrainScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const activeFrameRef = useRef<number>(-1);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);

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
    const loadedImages: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    let count = 0;

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const paddedIndex = String(i).padStart(5, "0");
      img.src = `/frames/${paddedIndex}.jpg`;

      img.onload = () => {
        if (!mounted) return;
        count++;
        setLoadedCount(count);
        if (count >= TOTAL_FRAMES) {
          imagesRef.current = loadedImages;
          setIsReady(true);
        }
      };

      img.onerror = () => {
        if (!mounted) return;
        count++;
        setLoadedCount(count);
        if (count >= TOTAL_FRAMES) {
          imagesRef.current = loadedImages;
          setIsReady(true);
        }
      };

      loadedImages[i - 1] = img;
    }

    return () => {
      mounted = false;
    };
  }, []);

  // 3. Aspect-Ratio-Preserving Contain Draw Function
  const renderFrame = useCallback((frameIdx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imagesRef.current[frameIdx];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;

    ctx.fillStyle = "#070B12";
    ctx.fillRect(0, 0, cw, ch);

    const imgRatio = img.naturalWidth / img.naturalHeight;
    const canvasRatio = cw / ch;

    let drawW: number, drawH: number, drawX: number, drawY: number;

    if (canvasRatio > imgRatio) {
      drawH = ch;
      drawW = ch * imgRatio;
      drawX = (cw - drawW) / 2;
      drawY = 0;
    } else {
      drawW = cw;
      drawH = cw / imgRatio;
      drawX = 0;
      drawY = (ch - drawH) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }, []);

  // 4. HiDPI Canvas Resize Synchronizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleResize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (!canvas) return;
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

  // 5. Frame Sync Animation Loop
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
    <div ref={containerRef} className="relative h-[450vh] bg-[#070B12] text-slate-100">
      {!isReady && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070B12] text-white">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-emerald-400 animate-spin" />
            <span className="font-mono-tech text-sm tracking-wider text-emerald-400">
              RAILGUARD TELEMETRY STREAM
            </span>
          </div>

          <div className="w-64 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/10 mb-4">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-sky-400 transition-all duration-150"
              style={{ width: `${loadPercent}%` }}
            />
          </div>

          <span className="font-mono-tech text-xs text-slate-400">
            Calibrating RailGuard Telemetry Stream... [{loadPercent}%]
          </span>
        </div>
      )}

      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full object-contain pointer-events-none" />

        <div
          className="fixed top-24 right-8 z-30 hidden lg:flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-xl border border-white/10 text-[11px] font-mono-tech"
          style={{ background: "rgba(5, 10, 18, 0.65)" }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-medium">LORA 433MHz ACTIVE</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            SECTOR: <span className="text-slate-200">{telemetry?.sector || "100KM NORTH"}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-300">&lt; 12ms</span>
        </div>

        {/* Story Beat 0 */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY, pointerEvents: heroPointer as any }}
          className="absolute inset-0 flex flex-col justify-center items-center text-center px-6 max-w-4xl mx-auto z-20"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono-tech text-xs mb-6 backdrop-blur-md">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>⚡ ZERO-OPTICAL CAB SIGNALING</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.08]">
            Sight Fails in Fog. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-sky-400">
              Physics Doesn’t.
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl font-light leading-relaxed mb-8">
            Wireless aspect telemetry delivered straight into the cab 3.5 km ahead of optical light signals.
          </p>

          <div className="flex items-center gap-2 font-mono-tech text-xs text-slate-400 bg-slate-950/60 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
            <span>↓</span>
            <span>SCROLL TO ADVANCE TRAIN THROUGH 100KM FOG CORRIDOR</span>
          </div>
        </motion.div>

        {/* Story Beat 1 */}
        <motion.div
          style={{ opacity: beat1Opacity, x: beat1X, pointerEvents: beat1Pointer as any }}
          className="absolute inset-0 flex items-center px-8 md:px-20 z-20"
        >
          <div className="max-w-xl p-8 rounded-3xl bg-slate-950/60 border border-white/10 backdrop-blur-2xl space-y-4 shadow-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tech text-emerald-400 tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>01 // THE VISIBILITY GAP</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
              Bridging the 95% Dark Zone
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light">
              Optical visibility drops below 35m in winter corridors. RailGuard sub-GHz LoRa broadcasts aspect status at sub-12ms latency without multi-billion rupee track overhauls.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2 font-mono-tech text-xs">
              <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/25">
                <div className="text-red-400 font-semibold mb-1">OPTICAL SIGHT</div>
                <div className="text-xl font-bold text-white">&lt; 35m</div>
                <div className="text-slate-400 text-[10px] mt-1">4.2s - 8.5s visual lag</div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/25">
                <div className="text-emerald-400 font-semibold mb-1">LORA RELAY</div>
                <div className="text-xl font-bold text-white">&gt; 3.5 km</div>
                <div className="text-slate-400 text-[10px] mt-1">&lt; 12ms radio latency</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Story Beat 2 */}
        <motion.div
          style={{ opacity: beat2Opacity, x: beat2X, pointerEvents: beat2Pointer as any }}
          className="absolute inset-0 flex items-center justify-end px-8 md:px-20 z-20"
        >
          <div className="max-w-xl p-8 rounded-3xl bg-slate-950/60 border border-white/10 backdrop-blur-2xl space-y-4 shadow-2xl text-right">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tech text-cyan-400 tracking-wider justify-end">
              <Cpu className="w-3.5 h-3.5" />
              <span>02 // EDGE & AI TOPOLOGY</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-bold text-white leading-tight">
              Micro-ATP + Agentic Triage
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light">
              Trackside battery-clamped ESP32 nodes stream aspect lights to cab HUDs, while Gemini AI resolves cascading sector delays at loop sidings.
            </p>

            <div className="flex justify-end gap-3 pt-2 font-mono-tech text-xs">
              <span className="px-3 py-1.5 rounded-lg bg-cyan-950/30 border border-cyan-400/30 text-cyan-300">
                ESP32 Solar Clamps
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-purple-950/30 border border-purple-400/30 text-purple-300">
                Gemini Multi-Agent
              </span>
            </div>
          </div>
        </motion.div>

        {/* Story Beat 3 */}
        <motion.div
          style={{ opacity: ctaOpacity, y: ctaY, pointerEvents: ctaPointer as any }}
          className="absolute inset-0 flex flex-col justify-center items-center text-center px-6 max-w-4xl mx-auto z-20"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono-tech text-xs mb-6 backdrop-blur-md">
            <Shield className="w-3.5 h-3.5" />
            <span>03 // UNIFIED REAL-TIME BUS</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-6">
            System Locked & Transmitting.
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-light leading-relaxed mb-8">
            Launch operations console to monitor live passenger manifests, pilot signals, and AI dispatch.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <NavLink
              href="/pilot"
              className="group px-7 py-3.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-sm transition-all duration-300 flex items-center gap-2 shadow-[0_0_35px_rgba(0,245,160,0.4)]"
            >
              <span>Loco-Pilot HUD</span>
              <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </NavLink>

            <NavLink
              href="/tt"
              className="px-7 py-3.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white text-sm font-medium transition backdrop-blur-xl border border-white/15"
            >
              OCC Conductor Manifest ➔
            </NavLink>

            <NavLink
              href="/passenger"
              className="px-7 py-3.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-sm font-medium transition backdrop-blur-xl border border-white/15"
            >
              Passenger Portal ➔
            </NavLink>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
