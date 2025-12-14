import React, { useState } from 'react'
import { BrowserRouter as Router } from 'react-router-dom';
import './App.css';
import { AppRoutes } from './components/LanguageRouter';
import { SEOHead } from './components/SEOHead';

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const toggleDarkMode = () => setDarkMode((prev) => !prev);
  return (
    <Router>
        <div className="app">
          <SEOHead />
          <AppRoutes />
        </div>
      </Router>
  )
}

export default App
