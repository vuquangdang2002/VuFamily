import { request, getApiBase } from './request';
import { AuthHelper } from '../AuthHelper.js';

export const authApi = {
    login: (username, password) => 
        request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    forgotPassword: (email) => 
        request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    getUsers: () => request('/users'),
    getUserAdmin: (id) => request(`/users/${id}`),
    resetUserPassword: (id, newPassword) => 
        request(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
    updateUserAdmin: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (data) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
    uploadAvatar: (formData) => {
        return fetch(`${getApiBase()}/auth/avatar`, {
            method: 'POST', 
            body: formData, 
            headers: { 'x-auth-token': AuthHelper.getToken() }
        }).then(res => res.json());
    },
    getPublicUsers: () => request('/users/public'),
};
