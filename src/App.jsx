import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header.jsx";
import TelemetryHUD from "./components/TelemetryHUD.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import PassengerPortal from "./pages/PassengerPortal.jsx";
import TTDashboard from "./pages/TTDashboard.jsx";
import OCCManifest from "./pages/OCCManifest.jsx";
import PilotHUD from "./pages/PilotHUD.jsx";

export default function App() {
  const [activeSector, setActiveSector] = useState({
    sectorNumber: 1,
    status: "SECTOR CLEARED [LORA VERIFIED]",
    timestamp: "13:51:24"
  });

  return (
    <Router>
      <AppShell activeSector={activeSector} setActiveSector={setActiveSector} />
    </Router>
  );
}

function AppShell({ activeSector }) {
  return (
    <div className="ops-container min-h-screen flex flex-col justify-between">
      {/* Global Navigation Header with Universal Emerald Status Badge */}
      <Header />

      {/* Hero-Only Floating HUD & Universal Fixed Bottom Telemetry Stream */}
      <TelemetryHUD activeSector={activeSector} />

      {/* Main Viewport Container with Guaranteed Zero-Overlap Safe Clearance */}
      <main className="ops-container" style={{ position: "relative", zIndex: 10 }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/passenger" element={<PassengerPortal />} />
          <Route path="/tt" element={<TTDashboard />} />
          <Route path="/occ" element={<OCCManifest />} />
          <Route path="/pilot" element={<PilotHUD />} />
          {/* Catch-all redirect to landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
