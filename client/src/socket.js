// This file exports a singleton socket.io client instance for use throughout the app
import { API_BASE_URL } from './apiConfig';
import { io } from 'socket.io-client';

// Debug logging
console.log('Socket connecting to:', API_BASE_URL.replace('/api', ''));

const socket = io(API_BASE_URL.replace('/api', ''), {
    transports: ['websocket'],
    withCredentials: true
});

export default socket;