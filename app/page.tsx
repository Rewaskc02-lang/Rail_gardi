import React from "react";
import TrainScroll from "../components/TrainScroll";
import { Cpu, Shield, Radio } from "lucide-react";

export const metadata = {
  title: "RailGuard AI — Cinematic Fog-Safe Rail Signal Relay",
  description: "Sub-GHz LoRa Mesh & Micro-ATP Cab Telemetry for Zero-Visibility Rail Corridors"
};

export default function Page() {
  return (
    <main className="relative min-h-screen bg-[#070B12] text-slate-100 selection:bg-emerald-400 selection:text-slate-950">
      {/* 60FPS Sticky Scrollytelling Sequence */}
      <TrainScroll />

      {/* Technical Architecture & Live Telemetry Dock */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 py-24 space-y-24">
        <section className="space-y-12">
          <div>
            <span className="font-mono-tech text-xs text-cyan-400 uppercase tracking-widest block mb-2">
              04 // HARDWARE & NETWORK TOPOLOGY
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
              Three Unified Operations Pillars
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-3xl bg-slate-950/60 border border-white/10 backdrop-blur-xl space-y-4 hover:border-cyan-400/40 transition duration-300">
              <Cpu className="w-8 h-8 text-cyan-400" />
              <h3 className="text-xl font-bold text-white">ESP32 + LoRa Mesh</h3>
              <p className="text-sm text-slate-300 leading-relaxed font-light">
                Trackside battery/solar clamp-on nodes broadcasting physical lamp aspects without altering legacy signaling circuits.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-950/60 border border-white/10 backdrop-blur-xl space-y-4 hover:border-emerald-400/40 transition duration-300">
              <Shield className="w-8 h-8 text-emerald-400" />
              <h3 className="text-xl font-bold text-white">Real-Time State Bus</h3>
              <p className="text-sm text-slate-300 leading-relaxed font-light">
                Sub-15ms WebSocket pipeline connecting passenger SOS safety triggers directly to conductor manifest screens.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-950/60 border border-purple-400/20 backdrop-blur-xl space-y-4 hover:border-purple-400/40 transition duration-300">
              <Radio className="w-8 h-8 text-purple-400" />
              <h3 className="text-xl font-bold text-white">Agentic AI Triage</h3>
              <p className="text-sm text-slate-300 leading-relaxed font-light">
                RailGuard AI ingests in-memory sector delay state to deliver human-readable loop-line hold recommendations.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
