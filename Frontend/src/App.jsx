import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Landing from './components/landing';
import Dashboard from './components/Dashboard';
import Team from './components/team';
import MapPage from './components/map';
import PotholesMap from './components/PotholesMap';
import SOS from './components/SOS';
import Alert from './components/Alert';
import Issue from './components/issue';
import UserWho from './components/user_who';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import AdminAssign from './pages/AdminAssign';
import IntersectionsAdmin from './pages/IntersectionsAdmin';
import MyIntersections from './pages/MyIntersections';
import LaneDashboard from './pages/LaneDashboard';
import WrongSide from './pages/WrongSide';
import AmbulanceDashboard from './pages/AmbulanceDashboard';
import AuthorityDashboard from './pages/AuthorityDashboard';
import IllegalParkingDashboard from './pages/IllegalParking/IllegalParkingDashboard';

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const toggleDarkMode = () => setDarkMode((prev) => !prev);
  return (
    <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<UserWho/>} />
            <Route path="/login" element={<LoginPage/>} />
            <Route path="/signup" element={<SignupPage/>} />
            <Route path="/home" element={<Landing/>} />
            <Route path="/dashboard" element={<ProtectedRoute roles={["employee","admin"]}><Dashboard/></ProtectedRoute>} />
            <Route path="/dashboard/:intersectionId" element={<ProtectedRoute roles={["employee","admin"]}><LaneDashboard/></ProtectedRoute>} />
            <Route path="/lane-dashboard" element={<ProtectedRoute roles={["employee","admin"]}><LaneDashboard/></ProtectedRoute>} />
            <Route path="/sos" element={<SOS/>} />
            <Route path="/team" element={<Team/>} />
            <Route path="/map" element={<MapPage/>} />
            <Route path="/potholes-map" element={<PotholesMap/>} />
            <Route path="/emergency" element={<Alert/>} />
            <Route path="/issue" element={<Issue/>} />
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminAssign/></ProtectedRoute>} />
            <Route path="/admin/intersections" element={<ProtectedRoute roles={["admin"]}><IntersectionsAdmin/></ProtectedRoute>} />
            <Route path="/my-intersections" element={<ProtectedRoute roles={["employee"]}><MyIntersections/></ProtectedRoute>} />
            <Route path="/wrong-side" element={<ProtectedRoute roles={["admin", "employee"]}><WrongSide/></ProtectedRoute>} />
            <Route path="/ambulance-dashboard" element={<ProtectedRoute roles={["ambulance_driver"]}><AmbulanceDashboard/></ProtectedRoute>} />
            <Route path="/authority/dashboard" element={<AuthorityDashboard/>} />
            <Route path="/illegal-parking" element={<ProtectedRoute roles={["employee", "admin"]}><IllegalParkingDashboard/></ProtectedRoute>} />
            <Route path="/unauthorized" element={<div style={{padding:'2rem'}}>Unauthorized</div>} />
          </Routes>
        </div>
      </Router>
  )
}

export default App
