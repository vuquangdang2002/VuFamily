import { request } from './request';

export const newsfeedApi = {
    getPosts: () => request('/posts'),
    createPost: (data) => request('/posts', { method: 'POST', body: JSON.stringify(data) }),
    deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
    reactToPost: (postId, emoji) => 
        request(`/posts/${postId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }),
    getComments: (postId) => request(`/posts/${postId}/comments`),
    addComment: (postId, content) => 
        request(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
    deleteComment: (commentId) => request(`/comments/${commentId}`, { method: 'DELETE' }),
};
