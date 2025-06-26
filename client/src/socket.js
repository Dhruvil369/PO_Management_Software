// This file exports a singleton socket.io client instance for use throughout the app
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

export default socket;
