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

export const stopEmergency = async () => {
    const response = await axios.post(`${API_URL}/stop`, {}, getAuthHeader());
    return response.data;
};

export const getIntersections = async () => {
    const response = await axios.get(`${API_URL}/intersections`, getAuthHeader());
    return response.data;
};
