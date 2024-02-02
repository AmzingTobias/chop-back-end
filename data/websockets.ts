import WebSocket from "ws";
const basketWebSockets: Map<number, Map<string, WebSocket>> = new Map();

export default basketWebSockets;
