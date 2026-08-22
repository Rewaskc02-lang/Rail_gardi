import { io } from "socket.io-client";
import { API_URL } from "./config.js";

// Global WebSocket Singleton (Single shared socket across all components)
const socket = io(API_URL, {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

export default socket;
