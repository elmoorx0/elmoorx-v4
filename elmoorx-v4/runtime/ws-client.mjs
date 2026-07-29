/**
 * Elmoorx v4 — WebSocket Client Library (للمتصفح، بدون تبعيات)
 * =============================================================
 * مكتبة عميل WebSocket تعمل في المتصفح مع:
 *   - Auto-reconnection مع exponential backoff
 *   - Message queuing (للرسائل أثناء الانقطاع)
 *   - Heartbeat/Ping-Pong
 *   - Rooms/Channels (يتطابق مع server API)
 *   - Event-driven API (on/off/once)
 *   - JSON message support
 *   - Binary support
 *   - Authentication
 *
 * الاستخدام:
 *   import { createWebSocketClient } from './ws-client.mjs';
 *   const ws = createWebSocketClient('ws://localhost:3000/ws', {
 *     token: 'jwt-token',
 *     rooms: ['chat', 'notifications'],
 *     reconnect: true,
 *   });
 *   ws.on('message', (data) => console.log(data));
 *   ws.send({ type: 'chat', text: 'hello' });
 *   ws.join('room-2');
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1) WEBSOCKET CLIENT
// ─────────────────────────────────────────────────────────────────────────────

export class WebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      token: null,
      rooms: [],
      reconnect: true,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      heartbeatInterval: 30000,
      heartbeatTimeout: 10000,
      messageQueueSize: 100,
      ...options,
    };

    this.ws = null;
    this.connected = false;
    this.connecting = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.rooms = new Set(this.options.rooms);
    this.eventHandlers = new Map(); // event → Set<handler>
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.lastPing = 0;

    // ابدأ الاتصال
    this._connect();
  }

  _connect() {
    if (this.connecting || this.connected) return;
    this.connecting = true;

    // أضف token للـ URL إذا وُجد
    let url = this.url;
    if (this.options.token) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}token=${encodeURIComponent(this.options.token)}`;
    }

    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.connected = true;
        this.connecting = false;
        this.reconnectAttempts = 0;
        this._flushQueue();
        this._startHeartbeat();
        // انضم للـ rooms المسجّلة
        for (const room of this.rooms) {
          this._sendRaw({ type: '__join', room });
        }
        this._emit('connect');
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        this.connected = false;
        this.connecting = false;
        this._stopHeartbeat();
        this._emit('close', event.code, event.reason);

        if (this.options.reconnect && event.code !== 4001) {
          this._scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        this._emit('error', error);
      };
    } catch (err) {
      this.connecting = false;
      this._emit('error', err);
      if (this.options.reconnect) {
        this._scheduleReconnect();
      }
    }
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this._emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.options.maxReconnectDelay
    );

    this._emit('reconnect', this.reconnectAttempts, delay);

    this.reconnectTimer = setTimeout(() => {
      this._connect();
    }, delay);
  }

  _handleMessage(data) {
    // Binary data
    if (data instanceof ArrayBuffer) {
      this._emit('binary', data);
      return;
    }

    // Text — حاول parse JSON
    let message = data;
    try {
      message = JSON.parse(data);
    } catch {}

    // رسائل النظام
    if (message && typeof message === 'object') {
      if (message.type === '__pong') {
        this.lastPing = 0;
        return;
      }
      if (message.type === '__joined') {
        this.rooms.add(message.room);
        this._emit('joined', message.room);
        return;
      }
      if (message.type === '__left') {
        this.rooms.delete(message.room);
        this._emit('left', message.room);
        return;
      }
      if (message.type === '__error') {
        this._emit('error', new Error(message.message));
        return;
      }
    }

    this._emit('message', message);
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        this.lastPing = Date.now();
        this._sendRaw({ type: '__ping' });
        // تحقق من الـ pong بعد timeout
        setTimeout(() => {
          if (this.lastPing > 0 && Date.now() - this.lastPing > this.options.heartbeatTimeout) {
            this._emit('heartbeat_timeout');
            this.ws.close(4000, 'Heartbeat timeout');
          }
        }, this.options.heartbeatTimeout);
      }
    }, this.options.heartbeatInterval);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _sendRaw(data) {
    if (typeof data === 'object') {
      data = JSON.stringify(data);
    }
    if (this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
      return true;
    }
    // ضع في queue
    if (this.messageQueue.length < this.options.messageQueueSize) {
      this.messageQueue.push(data);
    }
    return false;
  }

  _flushQueue() {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift();
      this.ws.send(msg);
    }
  }

  /**
   * يرسل رسالة (JSON أو string)
   */
  send(data) {
    return this._sendRaw(data);
  }

  /**
   * ينضم لـ room
   */
  join(room) {
    this.rooms.add(room);
    return this._sendRaw({ type: '__join', room });
  }

  /**
   * يغادر room
   */
  leave(room) {
    this.rooms.delete(room);
    return this._sendRaw({ type: '__leave', room });
  }

  /**
   * يسجّل handler للحدث
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * يسجّل handler مرة واحدة
   */
  once(event, handler) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      handler(...args);
    };
    return this.on(event, wrapper);
  }

  /**
   * يُلغي تسجيل handler
   */
  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  _emit(event, ...args) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (err) {
          // تجنّب كسر بقية handlers
          console.error(`[ws-client] Error in handler for "${event}":`, err);
        }
      }
    }
  }

  /**
   * يُغلق الاتصال
   */
  close(code = 1000, reason = '') {
    this.options.reconnect = false;
    this._stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close(code, reason);
    }
  }

  /**
   * يعيد الاتصال يدوياً
   */
  reconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.options.reconnect = true;
    this.reconnectAttempts = 0;
    this._connect();
  }

  /**
   * معلومات الحالة
   */
  getState() {
    return {
      connected: this.connected,
      connecting: this.connecting,
      reconnectAttempts: this.reconnectAttempts,
      rooms: [...this.rooms],
      queueSize: this.messageQueue.length,
      url: this.url,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) FACTORY
// ─────────────────────────────────────────────────────────────────────────────

export function createWebSocketClient(url, options = {}) {
  return new WebSocketClient(url, options);
}

export default { WebSocketClient, createWebSocketClient };
