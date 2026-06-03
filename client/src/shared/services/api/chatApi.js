import { request } from './request';

export const chatApi = {
    getChats: () => request('/chats'),
    createChat: (data) => request('/chats', { method: 'POST', body: JSON.stringify(data) }),
    getChatMessages: (roomId) => request(`/chats/${roomId}/messages`),
    getChatMessagesSince: (roomId, since) => request(`/chats/${roomId}/messages?since=${since}`),
    sendChatMessage: (roomId, data) => 
        request(`/chats/${roomId}/messages`, { method: 'POST', body: JSON.stringify(data) }),
    updateChatName: (roomId, name) => 
        request(`/chats/${roomId}/name`, { method: 'PUT', body: JSON.stringify({ name }) }),
    leaveChat: (roomId) => request(`/chats/${roomId}/leave`, { method: 'POST' }),
    kickChatUser: (roomId, userId) => request(`/chats/${roomId}/kick/${userId}`, { method: 'POST' }),
};
