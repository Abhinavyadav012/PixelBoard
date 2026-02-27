import api from './axios';

export const getAllRooms     = ()                       => api.get('/rooms');
export const createRoom     = (name, roomCode)          => api.post('/rooms/create', { name, roomCode });
export const joinRoom       = (roomId)                  => api.post('/rooms/join', { roomId });
export const leaveRoom      = (roomId)                  => api.post(`/rooms/${roomId}/leave`);
export const getRoomDetails = (roomId)                  => api.get(`/rooms/${roomId}`);
export const deleteRoom     = (roomId)                  => api.delete(`/rooms/${roomId}`);
