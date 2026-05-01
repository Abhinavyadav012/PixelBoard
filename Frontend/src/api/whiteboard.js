import api from './axios';

export const getBoardStrokes = (roomId) => api.get(`/whiteboard/${roomId}`);
