import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const loginOptions = (data) => api.post('/auth/webauthn/login/generate-options', data);
export const loginVerify = (data) => api.post('/auth/webauthn/login/verify', data);
export const registerOptions = (data) => api.post('/auth/webauthn/register/generate-options', data);
export const registerVerify = (data) => api.post('/auth/webauthn/register/verify', data);
export const getElectionStatus = () => api.get('/election/status');
export const controlElection = (data) => api.post('/election/control', data);
export const voteOptions = (data) => api.post('/vote/generate-options', data);
export const voteVerify = (data) => api.post('/vote/verify', data);
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
