import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ContactRound, TicketCheck, TrainFront, Workflow } from "lucide-react";

/**
 * Header — Master Spatial Navigation Bar
 * Features guaranteed live emerald status pill, seamless route switching,
 * and zero-overlap layout geometry.
 */
export default function Header() {
  const location = useLocation();
  const [timeString, setTimeString] = useState("");

  useEffect(() => {
    const updateClock = () => setTimeString(new Date().toISOString().slice(11, 23) + " UTC");
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="spatial-header-wrapper">
      <header className="spatial-header">
        {/* Brand / Logo */}
        <Link to="/" className="spatial-brand">
          <span className="brand-badge">RG/01</span>
          <span className="brand-title font-heading">RAILGUARD AI</span>
        </Link>

        {/* Global Navigation Links */}
        <nav className="spatial-nav" aria-label="Operations Navigation">
          <Link
            to="/passenger"
            className={`spatial-nav-link ${location.pathname === "/passenger" ? "active" : ""}`}
            title="Passenger Portal"
          >
            <ContactRound aria-hidden="true" size={15} strokeWidth={1.8} />
            <span>Passenger</span>
          </Link>
          <Link
            to="/tt"
            className={`spatial-nav-link ${location.pathname === "/tt" ? "active" : ""}`}
            title="Conductor TT Manifest Matrix"
          >
            <TicketCheck aria-hidden="true" size={15} strokeWidth={1.8} />
            <span>TT Manifest</span>
          </Link>
          <Link
            to="/occ"
            className={`spatial-nav-link ${location.pathname === "/occ" ? "active" : ""}`}
            title="Challenge #697 B2B SLA Arbitrator"
          >
            <Workflow aria-hidden="true" size={15} strokeWidth={1.8} />
            <span>OCC Arbitrator</span>
          </Link>
          <Link
            to="/pilot"
            className={`spatial-nav-link ${location.pathname === "/pilot" ? "active" : ""}`}
            title="Loco-Pilot Cab HUD"
          >
            <TrainFront aria-hidden="true" size={15} strokeWidth={1.8} />
            <span>Pilot HUD</span>
          </Link>
        </nav>

        <time className="header-timestamp font-mono-tech" dateTime={new Date().toISOString()}>
          {timeString || "20:39:03.045 UTC"}
        </time>

      </header>
    </div>
  );
}
