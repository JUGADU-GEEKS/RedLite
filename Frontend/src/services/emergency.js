import axios from 'axios';
import { getToken } from './auth';

const API_URL = 'http://localhost:8000/emergency';

const getAuthHeader = () => {
    const token = getToken();
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const startEmergency = async (data) => {
    const response = await axios.post(`${API_URL}/start`, data, getAuthHeader());
    return response.data;
};

export const sendHeartbeat = async (data) => {
    const response = await axios.post(`${API_URL}/heartbeat`, data, getAuthHeader());
    return response.data;
};

export const stopEmergency = async (data = {}) => {
    const response = await axios.post(`${API_URL}/stop`, data, getAuthHeader());
    return response.data;
};

export const getIntersections = async () => {
    const response = await axios.get(`${API_URL}/intersections`, getAuthHeader());
    return response.data;
};

export const getEmergencyStatus = async () => {
    const response = await axios.get(`${API_URL}/status`, getAuthHeader());
    return response.data;
};

export const getEmergencyOverview = async () => {
    const response = await axios.get(`${API_URL}/overview`, getAuthHeader());
    return response.data;
};
