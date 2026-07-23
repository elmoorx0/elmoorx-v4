/**
 * Elmoorx v4 — Realtime (WebSocket Server + Client)
 * ===================================================
 * نظام realtime متكامل:
 *   - WebSocket server (للـ Node.js)
 *   - WebSocket client (للمتصفح)
 *   - Rooms (غرف محادثة)
 *   - Pub/Sub
 *   - Presence (مستخدمون أونلاين)
 *   - Reactive signals للبيانات الحية
 *   - Auto-reconnect
 *   - Heartbeat
 */

import { $state, $effect } from '../runtime/core.mjs';
import { WebSocketServer, WebSocket } from '../vendor/ws-shim.mjs';

// ─────────────────────────────────────────────────────────────────────────────
// 1) REALTIME SERVER (Node.js)
// ─────────────────────────────────────────────────────────────────────────────

export class RealtimeServer {
  constructor(options = {}) {
    this.port = options.port || 8080;
    this.server = options.server; // HTTP server
    this.wss = null;
    this.clients = new Map(); // id → { ws, rooms, user }
    this.rooms = new Map(); // roomName → Set of client ids
    this.presence = new Map(); // userId → { online, lastSeen }
    this.handlers = new Map(); // event → handler
  }

  start() {
    this.wss = this.server
      ? new WebSocketServer({ server: this.server, path: '/__realtime__' })
      : null;

    if (this.wss) {
      this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    }

    console.log('%c✦ Realtime server نشط', 'color:#10b981;font-weight:bold;');
  }

  handleConnection(ws, req) {
    const clientId = generateId();
    const client = { id: clientId, ws, rooms: new Set(), user: null };
    this.clients.set(clientId, client);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(client, msg);
      } catch (err) {
        console.error('[realtime] خطأ:', err);
      }
    });

    ws.on('close', () => {
      // أزِل من كل الغرف
      for (const room of client.rooms) {
        this.rooms.get(room)?.delete(clientId);
        this.broadcastToRoom(room, {
          type: 'presence:update',
          room,
          userId: client.user?.id,
          online: false,
        });
      }
      if (client.user) {
        this.presence.delete(client.user.id);
      }
      this.clients.delete(clientId);
    });

    // أرسل clientId للعميل
    ws.send(JSON.stringify({ type: 'connected', clientId }));
  }

  handleMessage(client, msg) {
    const { type, room, event, data, target } = msg;

    switch (type) {
      case 'join':
        if (room) {
          client.rooms.add(room);
          if (!this.rooms.has(room)) this.rooms.set(room, new Set());
          this.rooms.get(room).add(client.id);
          // أخبر الغرف بأن المستخدم انضم
          this.broadcastToRoom(room, {
            type: 'presence:update',
            room,
            userId: client.user?.id,
            online: true,
          });
        }
        break;

      case 'leave':
        if (room) {
          client.rooms.delete(room);
          this.rooms.get(room)?.delete(client.id);
        }
        break;

      case 'auth':
        client.user = data;
        this.presence.set(data.id, { online: true, lastSeen: Date.now() });
        break;

      case 'broadcast':
        // أرسل للكل
        this.broadcast({ type: 'message', event, data, from: client.id });
        break;

      case 'broadcast:room':
        // أرسل للغرفة
        this.broadcastToRoom(room, { type: 'message', event, data, from: client.id });
        break;

      case 'broadcast:private':
        // أرسل لمستخدم محدد
        this.sendToUser(target, { type: 'message', event, data, from: client.id });
        break;

      case 'ping':
        client.ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        // شغّل handler مخصص
        const handler = this.handlers.get(type);
        if (handler) handler(client, msg, this);
    }
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    for (const client of this.clients.values()) {
      try { client.ws.send(data); } catch {}
    }
  }

  broadcastToRoom(room, message) {
    const members = this.rooms.get(room);
    if (!members) return;
    const data = JSON.stringify(message);
    for (const clientId of members) {
      const client = this.clients.get(clientId);
      try { client?.ws.send(data); } catch {}
    }
  }

  sendToUser(userId, message) {
    const data = JSON.stringify(message);
    for (const client of this.clients.values()) {
      if (client.user?.id === userId) {
        try { client.ws.send(data); } catch {}
      }
    }
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }

  getPresence(room) {
    const members = this.rooms.get(room);
    if (!members) return [];
    const presence = [];
    for (const clientId of members) {
      const client = this.clients.get(clientId);
      if (client?.user) {
        presence.push({
          userId: client.user.id,
          name: client.user.name,
          online: true,
        });
      }
    }
    return presence;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) REALTIME CLIENT (Browser)
// ─────────────────────────────────────────────────────────────────────────────

export class RealtimeClient {
  constructor(options = {}) {
    this.url = options.url || `ws://${location.host}/__realtime__`;
    this.ws = null;
    this.connected = $state(false);
    this.rooms = new Set();
    this.handlers = new Map(); // event → Set of handlers
    this.presence = $state(new Map());
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.heartbeatInterval = null;
    this.user = null;
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.connected.set(true);
      this.reconnectDelay = 1000;
      console.log('%c✦ Realtime متصل', 'color:#10b981;font-weight:bold;');

      // أعد الانضمام للغرف
      for (const room of this.rooms) {
        this.send({ type: 'join', room });
      }

      // أعد المصادقة
      if (this.user) {
        this.send({ type: 'auth', data: this.user });
      }

      // ابدأ heartbeat
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (err) {
        console.error('[realtime] خطأ:', err);
      }
    };

    this.ws.onclose = () => {
      this.connected.set(false);
      this.stopHeartbeat();
      // إعادة الاتصال
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    };

    this.ws.onerror = (err) => {
      console.error('[realtime] خطأ:', err);
    };
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'connected':
        this.clientId = msg.clientId;
        break;

      case 'message':
        const handlers = this.handlers.get(msg.event);
        if (handlers) {
          for (const h of handlers) {
            try { h(msg.data, msg); } catch (e) { console.error(e); }
          }
        }
        // شغّل handlers عامة
        const anyHandlers = this.handlers.get('*');
        if (anyHandlers) {
          for (const h of anyHandlers) {
            try { h(msg); } catch (e) { console.error(e); }
          }
        }
        break;

      case 'presence:update':
        const newPresence = new Map(this.presence());
        if (msg.online) {
          newPresence.set(msg.userId, { online: true });
        } else {
          newPresence.delete(msg.userId);
        }
        this.presence.set(newPresence);
        break;

      case 'pong':
        // heartbeat response
        break;
    }
  }

  send(message) {
    if (this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify(message));
    }
  }

  auth(user) {
    this.user = user;
    this.send({ type: 'auth', data: user });
  }

  join(room) {
    this.rooms.add(room);
    this.send({ type: 'join', room });
  }

  leave(room) {
    this.rooms.delete(room);
    this.send({ type: 'leave', room });
  }

  /**
   * يبث حدث للكل
   */
  broadcast(event, data) {
    this.send({ type: 'broadcast', event, data });
  }

  /**
   * يبث لغرفة معينة
   */
  broadcastToRoom(room, event, data) {
    this.send({ type: 'broadcast:room', room, event, data });
  }

  /**
   * يبث لمستخدم معين
   */
  sendToUser(userId, event, data) {
    this.send({ type: 'broadcast:private', target: userId, event, data });
  }

  /**
   * يستمع لحدث
   */
  on(event, handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  /**
   * hook تفاعلي للحدث
   */
  useEvent(event) {
    const data = $state(null);
    this.on(event, (d) => data.set(d));
    return data;
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }

  disconnect() {
    this.stopHeartbeat();
    this.ws?.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) REALTIME MANAGER (singleton)
// ─────────────────────────────────────────────────────────────────────────────

let clientInstance = null;

export function useRealtime(options) {
  if (!clientInstance) {
    clientInstance = new RealtimeClient(options);
    clientInstance.connect();
  }
  return clientInstance;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export default {
  RealtimeServer,
  RealtimeClient,
  useRealtime,
};
