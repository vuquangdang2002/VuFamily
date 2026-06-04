import { request } from './request';

export const eventApi = {
    getEvents: () => request('/events'),
    createEvent: (data) => request('/events', { method: 'POST', body: JSON.stringify(data) }),
    deleteEvent: (id) => request(`/events/${id}`, { method: 'DELETE' }),
    registerEvent: (id) => request(`/events/${id}/register`, { method: 'POST' }),
    unregisterEvent: (id) => request(`/events/${id}/unregister`, { method: 'POST' }),
};
