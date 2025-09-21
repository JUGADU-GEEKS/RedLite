import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Landing from './components/landing';
import Dashboard from './components/Dashboard';
import Team from './components/team';
import MapPage from './components/map';
import SOS from './components/SOS';
import Alert from './components/Alert';
import Issue from './components/issue';
import UserWho from './components/user_who';
import Login from './components/login';

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const toggleDarkMode = () => setDarkMode((prev) => !prev);
  return (
    <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<UserWho/>} />
            <Route path="/login" element={<Login/>} />
            <Route path="/home" element={<Landing/>} />
            <Route path="/dashboard" element={<Dashboard/>} />
            <Route path="/sos" element={<SOS/>} />
            <Route path="/team" element={<Team/>} />
            <Route path="/map" element={<MapPage/>} />
            <Route path="/emergency" element={<Alert/>} />
            <Route path="/issue" element={<Issue/>} />
          </Routes>
        </div>
      </Router>
  )
}

export default App
