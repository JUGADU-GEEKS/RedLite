import React from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';

function getAuth() {
  const token = localStorage.getItem('lanezy_token');
  const userRaw = localStorage.getItem('lanezy_user');
  return { token, user: userRaw ? JSON.parse(userRaw) : null };
}

export default function ProtectedRoute({ children, roles }) {
  const { lang } = useParams();
  const location = useLocation();
  const { token, user } = getAuth();
  
  // Extract language from URL or default to 'en'
  const currentLang = lang || 'en';
  
  // Preserve language prefix in redirects
  if (!token || !user) {
    return <Navigate to={`/${currentLang}/login`} replace state={{ from: location }} />;
  }
  
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/${currentLang}/unauthorized`} replace />;
  }
  
  return children;
}
