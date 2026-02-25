import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AuditorDashboard from './pages/AuditorDashboard';
import VoterDashboard from './pages/VoterDashboard';
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#f8fafc] text-gray-800 font-sans">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/auditor" element={<AuditorDashboard />} />
          <Route path="/voter" element={<VoterDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;