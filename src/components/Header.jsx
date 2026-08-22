import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import socket from "../socket.js";

export default function Header() {
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }
    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    setIsConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <div className="spatial-header-wrapper">
      <header className="spatial-header">
        <Link to="/" className="spatial-brand">
          <span className="brand-badge">LORA MESH</span>
          <span className="brand-title">RAILGUARD AI</span>
        </Link>

        <nav className="spatial-nav" aria-label="Portals Navigation">
          <Link
            to="/passenger"
            className={`spatial-nav-link ${location.pathname === "/passenger" ? "active" : ""}`}
          >
            <span>👤</span> Passenger
          </Link>
          <Link
            to="/occ"
            className={`spatial-nav-link ${location.pathname === "/occ" ? "active" : ""}`}
          >
            <span>📋</span> OCC Manifest
          </Link>
          <Link
            to="/tt"
            className={`spatial-nav-link ${location.pathname === "/tt" ? "active" : ""}`}
          >
            <span>🎫</span> TT Dashboard
          </Link>
          <Link
            to="/pilot"
            className={`spatial-nav-link ${location.pathname === "/pilot" ? "active" : ""}`}
          >
            <span>🚦</span> Pilot HUD
          </Link>
        </nav>

        <div className="status-indicator-pill">
          <span
            className="hud-dot"
            style={{
              background: isConnected ? "var(--glow-mint)" : "var(--glow-crimson)",
              boxShadow: isConnected ? "0 0 10px var(--glow-mint)" : "0 0 10px var(--glow-crimson)"
            }}
          />
          <span style={{ color: isConnected ? "var(--glow-mint)" : "var(--glow-crimson)" }}>
            {isConnected ? "TELEMETRY LIVE" : "OFFLINE"}
          </span>
        </div>
      </header>
    </div>
  );
}
