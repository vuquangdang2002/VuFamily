import { request, mapToCamelCase } from './request';

export const memberApi = {
    getMembers: async () => {
        const res = await request('/members');
        if (res.success) res.data = res.data.map(mapToCamelCase);
        return res;
    },
    getMember: async (id) => {
        const res = await request(`/members/${id}`);
        if (res.success && res.data) res.data = mapToCamelCase(res.data);
        return res;
    },
    searchMembers: async (q) => {
        const res = await request(`/members/search?q=${encodeURIComponent(q)}`);
        if (res.success) res.data = res.data.map(mapToCamelCase);
        return res;
    },
    getChildren: async (id) => {
        const res = await request(`/members/${id}/children`);
        if (res.success) res.data = res.data.map(mapToCamelCase);
        return res;
    },
    createMember: (data) => request('/members', { method: 'POST', body: JSON.stringify(data) }),
    updateMember: (id, data) => request(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteMember: (id) => request(`/members/${id}`, { method: 'DELETE' }),
    getStats: () => request('/stats'),
    getAchievements: (id) => request(`/members/${id}/achievements`),
    addAchievement: (data) => request('/achievements', { method: 'POST', body: JSON.stringify(data) }),
    deleteAchievement: (id) => request(`/achievements/${id}`, { method: 'DELETE' }),
};
