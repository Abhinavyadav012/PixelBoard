import api from './axios';

export const getRoomMessages = (roomId, page = 1, limit = 30) =>
  api.get(`/messages/${roomId}`, { params: { page, limit } });

export const sendMessage = (data) => api.post('/messages/send', data);
