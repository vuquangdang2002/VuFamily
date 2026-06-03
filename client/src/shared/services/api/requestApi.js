import { request } from './request';

export const requestApi = {
    submitRequest: (memberId, changes, note) => 
        request('/requests', { method: 'POST', body: JSON.stringify({ memberId, changes, note }) }),
    getAllRequests: () => request('/requests'),
    getPendingRequests: () => request('/requests/pending'),
    approveRequest: (id) => request(`/requests/${id}/approve`, { method: 'POST' }),
    rejectRequest: (id, reason) => 
        request(`/requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ rejectReason: reason }) }),
};
