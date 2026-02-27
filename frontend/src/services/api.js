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
export const generateOtp = (data) => api.post('/auth/generate-otp', data);
export const getStats = () => api.get('/stats');
export const getBlockchain = () => api.get('/blockchain');
export const getLogs = () => api.get('/logs');
export const getRepresentatives = () => api.get('/representatives');
export const getRepresentativesByDistrict = (districtId) => api.get(`/representatives/${districtId}`);
export const addRepresentative = (data, adminId) => api.post('/representatives', data, { params: { admin_id: adminId } });
export const deleteRepresentative = (id, adminId) => api.delete(`/representatives/${id}`, { params: { admin_id: adminId } });
export const getManagedUsers = (adminId) => api.get('/admin/users', { params: { admin_id: adminId } });
export const addManagedUser = (data) => api.post('/admin/users', data);
export const deleteManagedUser = (adminId, voterId) =>
    api.delete(`/admin/users/${voterId}`, { params: { admin_id: adminId } });
export const syncDataset = (adminId) => api.post('/admin/sync-dataset', null, { params: { admin_id: adminId } });
export const getVoterStatus = (identifier, requesterId) =>
    api.get(`/admin/voter-status/${identifier}`, { params: { requester_id: requesterId } });

export const getConstituencies = () => api.get('/admin/constituencies');
export const addConstituency = (data) => api.post('/admin/constituencies', data);
export const deleteConstituency = (id) => api.delete(`/admin/constituencies/${id}`);

export const getActiveNotification = () => api.get('/notifications/active');
export const createNotification = (data) => api.post('/admin/notifications', data);
export const clearNotifications = () => api.delete('/admin/notifications');

export const getVoterReceipt = (voterId) => api.get(`/voter/${voterId}/receipt`);
export const verifyBlockHash = (hash) => api.get(`/blockchain/verify/${hash}`);

export default api;
