// This file exports a singleton socket.io client instance for use throughout the app
import { API_BASE_URL } from './apiConfig';
import { io } from 'socket.io-client';

const socket = io(API_BASE_URL.replace('/api', ''));

export default socket;