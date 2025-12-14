import React from 'react';
import { Navigate } from 'react-router-dom';

function getAuth() {
  const token = localStorage.getItem('lanezy_token');
  const userRaw = localStorage.getItem('lanezy_user');
  return { token, user: userRaw ? JSON.parse(userRaw) : null };
}

export default function ProtectedRoute({ children, roles }) {
  const { token, user } = getAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children;
}
