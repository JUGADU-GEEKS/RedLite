const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export function getToken() {
  return localStorage.getItem("lanezy_token");
}

export function getUser() {
  const raw = localStorage.getItem("lanezy_user");
  return raw ? JSON.parse(raw) : null;
}

export function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Login failed");
  }
  const data = await res.json();
  localStorage.setItem("lanezy_token", data.access_token);
  localStorage.setItem("lanezy_user", JSON.stringify(data.user));
  return data.user;
}

export async function signup(data) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Signup failed");
  }
  return await res.json();
}

export function logout() {
  localStorage.removeItem("lanezy_token");
  localStorage.removeItem("lanezy_user");
  window.location.href = "/login";
}

// Note: For production, prefer httpOnly cookies instead of localStorage.
