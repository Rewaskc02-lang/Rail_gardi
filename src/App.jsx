import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header.jsx";
import TelemetryHUD from "./components/TelemetryHUD.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import PassengerPage from "./pages/PassengerPage.jsx";
import TTPage from "./pages/TTPage.jsx";
import PilotPage from "./pages/PilotPage.jsx";
import OCCDashboard from "./pages/OCCDashboard.jsx";

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
    <>
      {/* NASA / ChainGPT Telemetry Corner Overlay */}
      <TelemetryHUD activeSector={activeSector} />

      {/* Operations Header */}
      <Header />

      {/* Foreground Content Container */}
      <main className="ops-container" style={{ position: "relative", zIndex: 10 }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/passenger" element={<PassengerPage />} />
          <Route path="/tt" element={<TTPage />} />
          <Route path="/pilot" element={<PilotPage />} />
          <Route path="/occ" element={<OCCDashboard />} />
        </Routes>
      </main>
    </>
  );
}
