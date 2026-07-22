/**
 * Elmoorx v4 — WebSocket Shim (بدون تبعيات)
 * ============================================
 * تنفيذ WebSocket بسيط باستخدام Node.js المدمج فقط.
 * بديل لـ package `ws` — لا يحتاج npm install.
 *
 * يدعم:
 *   - بروتوكول WebSocket القياسي (RFC 6455)
 *   - Server فقط (للـ HMR)
 *   - نصوص و binary
 *   - ping/pong للحفاظ على الاتصال
 */

import { createHash, randomBytes } from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export class WebSocketServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.path = options.path || '/';
    this.httpServer = options.server;
    if (this.httpServer) {
      this.httpServer.on('upgrade', (req, socket, head) => this.handleUpgrade(req, socket, head));
    }
  }

  handleUpgrade(req, socket, head) {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== this.path) return;

    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const accept = createHash('sha1').update(key + GUID).digest('base64');
    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '',
      '',
    ].join('\r\n');

    socket.write(responseHeaders);
    if (head && head.length) socket.write(head);

    const ws = new WebSocket(socket);
    this.emit('connection', ws, req);
  }
}

export class WebSocket extends EventEmitter {
  constructor(socket) {
    super();
    this.socket = socket;
    this.readyState = 1; // OPEN
    this._buffer = Buffer.alloc(0);

    socket.on('data', (chunk) => this._onData(chunk));
    socket.on('close', () => this._onClose());
    socket.on('error', (err) => this.emit('error', err));
  }

  _onData(chunk) {
    this._buffer = Buffer.concat([this._buffer, chunk]);
    while (this._buffer.length >= 2) {
      const frame = this._parseFrame();
      if (!frame) break;
      this._handleFrame(frame);
    }
  }

  _parseFrame() {
    const buf = this._buffer;
    if (buf.length < 2) return null;

    const b0 = buf[0];
    const b1 = buf[1];
    const fin = (b0 & 0x80) !== 0;
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let payloadLen = b1 & 0x7f;
    let offset = 2;

    if (payloadLen === 126) {
      if (buf.length < 4) return null;
      payloadLen = buf.readUInt16BE(2);
      offset = 4;
    } else if (payloadLen === 127) {
      if (buf.length < 10) return null;
      payloadLen = Number(buf.readBigUInt64BE(2));
      offset = 10;
    }

    let mask = null;
    if (masked) {
      if (buf.length < offset + 4) return null;
      mask = buf.slice(offset, offset + 4);
      offset += 4;
    }

    if (buf.length < offset + payloadLen) return null;

    let payload = buf.slice(offset, offset + payloadLen);
    if (mask) {
      payload = Buffer.from(payload); // copy
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= mask[i % 4];
      }
    }

    this._buffer = buf.slice(offset + payloadLen);
    return { fin, opcode, payload };
  }

  _handleFrame(frame) {
    switch (frame.opcode) {
      case 0x0: // continuation
        if (this._fragmented) {
          this._fragmentedPayload = Buffer.concat([this._fragmentedPayload, frame.payload]);
          if (frame.fin) {
            this.emit('message', this._fragmentedPayload.toString('utf8'));
            this._fragmented = false;
          }
        }
        break;
      case 0x1: // text
        if (frame.fin) {
          this.emit('message', frame.payload.toString('utf8'));
        } else {
          this._fragmented = true;
          this._fragmentedPayload = frame.payload;
        }
        break;
      case 0x2: // binary
        if (frame.fin) {
          this.emit('message', frame.payload);
        } else {
          this._fragmented = true;
          this._fragmentedPayload = frame.payload;
        }
        break;
      case 0x8: // close
        this.close();
        break;
      case 0x9: // ping
        this._sendFrame(0xa, frame.payload);
        break;
      case 0xa: // pong
        break;
    }
  }

  send(data) {
    if (this.readyState !== 1) return;
    const isBuffer = Buffer.isBuffer(data);
    const payload = isBuffer ? data : Buffer.from(data, 'utf8');
    this._sendFrame(isBuffer ? 0x2 : 0x1, payload);
  }

  _sendFrame(opcode, payload) {
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    header[0] = 0x80 | opcode; // FIN + opcode
    this.socket.write(Buffer.concat([header, payload]));
  }

  close() {
    if (this.readyState === 1) {
      this._sendFrame(0x8, Buffer.alloc(0));
      this.readyState = 2; // CLOSING
    }
    this.socket.end();
    this.readyState = 3; // CLOSED
    this.emit('close');
  }

  _onClose() {
    if (this.readyState !== 3) {
      this.readyState = 3;
      this.emit('close');
    }
  }
}

export default { WebSocketServer, WebSocket };
