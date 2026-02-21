import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const login = (data) => api.post('/auth/login/verify', data);
export const register = (data) => api.post('/auth/register/verify', data);
export const getElectionStatus = () => api.get('/election/status');
export const controlElection = (data) => api.post('/election/control', data);
export const castVote = (data) => api.post('/vote', data);
export const getStats = () => api.get('/stats');
export const getBlockchain = () => api.get('/blockchain');
export const getLogs = () => api.get('/logs');
export const getRepresentatives = () => api.get('/representatives');
export const addRepresentative = (data) => api.post('/representatives', data);
export const deleteRepresentative = (id) => api.delete(`/representatives/${id}`);
export const getManagedUsers = (adminId) => api.get('/admin/users', { params: { admin_id: adminId } });
export const addManagedUser = (data) => api.post('/admin/users', data);
export const deleteManagedUser = (adminId, voterId) =>
    api.delete(`/admin/users/${voterId}`, { params: { admin_id: adminId } });

export default api;
