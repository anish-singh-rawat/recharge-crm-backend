import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';
import { fileURLToPath } from 'url';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
} from '@whiskeysockets/baileys';
import logger from '../config/logger.js';
import { getIO } from '../socket/socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_DIR = path.resolve(__dirname, '../../sessions/whatsapp-session');
const baileysLogger = pino({ level: 'silent' });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function toJid(number) {
  if (!number) return null;
  let clean = String(number).replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    clean = '91' + clean;
  }
  return `${clean}@s.whatsapp.net`;
}


class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processNext();
    });
  }

  async processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    const { task, resolve, reject } = this.queue.shift();
    try {
      const result = await task();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      const cooldown = 2000 + Math.floor(Math.random() * 1500);
      setTimeout(() => {
        this.processing = false;
        this.processNext();
      }, cooldown);
    }
  }

  getPendingCount() {
    return this.queue.length;
  }
}

class WhatsAppService {
  constructor() {
    this.sessionPath = SESSION_DIR;
    this.sock = null;
    this.isReady = false;
    this.latestQR = null;
    this.qrGeneratedAt = null;
    this._qrWasShown = false;
    this._version = null;
    this.status = 'disconnected';
    this.userPhone = null;
    this.destroyed = false;
    this._qrExpireTimer = null;
    this._autoRegenTimer = null;
    this._reconnectTimer = null;
    this._listeners = new Set();
    this._reconnectAttempt = 0;
    this._maxReconnectAttempts = Infinity;
    this._socketId = 0;
    this.messageQueue = new MessageQueue();
  }

  hasSessionFiles() {
    try {
      if (!fs.existsSync(this.sessionPath)) return false;
      const credsPath = path.join(this.sessionPath, 'creds.json');
      if (!fs.existsSync(credsPath)) return false;
      const content = fs.readFileSync(credsPath, 'utf8');
      const data = JSON.parse(content);
      return Boolean(data?.me?.id || data?.account || data?.registered === true);
    } catch {
      return false;
    }
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notifyListeners(event, data = {}) {
    const payload = { ...this.getStatus(), ...data };
    for (const listener of this._listeners) {
      try {
        listener(event, payload);
      } catch (err) {
        logger.warn('[WhatsApp] Listener error:', err.message);
      }
    }

    try {
      const io = getIO();
      if (io) {
        io.to('admins').emit(`whatsapp:${event}`, payload);
        io.to('admins').emit('whatsapp:status', payload);
      }
    } catch {}
  }

  async _ensureVersion() {
    if (!this._version) {
      try {
        const fetchPromise = fetchLatestBaileysVersion();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Version fetch timeout')), 2000)
        );
        const { version } = await Promise.race([fetchPromise, timeoutPromise]);
        this._version = version || [2, 3000, 1043857760];
        logger.info(`[WhatsApp] Baileys WA version: ${this._version.join('.')}`);
      } catch {
        this._version = [2, 3000, 1043857760];
        logger.info(`[WhatsApp] Using cached WA version: ${this._version.join('.')}`);
      }
    }
    return this._version;
  }

  _clearTimers() {
    if (this._qrExpireTimer) {
      clearTimeout(this._qrExpireTimer);
      this._qrExpireTimer = null;
    }
    if (this._autoRegenTimer) {
      clearTimeout(this._autoRegenTimer);
      this._autoRegenTimer = null;
    }
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  _closeSocket(sock) {
    if (!sock) return;
    try {
      sock.ev.removeAllListeners();
    } catch {}
    try {
      if (sock.ws && typeof sock.ws.close === 'function') {
        sock.ws.close();
      } else if (typeof sock.end === 'function') {
        sock.end(new Error('Socket replaced'));
      }
    } catch {}
  }

  _waitForQR(timeoutMs = 5000) {
    if (this.latestQR) return Promise.resolve(this.latestQR);
    if (this.isReady || this.status === 'connected') return Promise.resolve(null);

    return new Promise((resolve) => {
      let unsubscribe;
      const timer = setTimeout(() => {
        if (unsubscribe) unsubscribe();
        resolve(this.latestQR);
      }, timeoutMs);

      unsubscribe = this.subscribe((event, data) => {
        if (event === 'qr' || data.qr) {
          clearTimeout(timer);
          if (unsubscribe) unsubscribe();
          resolve(data.qr || this.latestQR);
        } else if (event === 'connected' || data.status === 'connected') {
          clearTimeout(timer);
          if (unsubscribe) unsubscribe();
          resolve(null);
        }
      });
    });
  }

  async init(autoStart = false) {
    if (this.sock && this.status === 'connected') {
      return this.getStatus();
    }

    if (autoStart && !this.hasSessionFiles()) {
      logger.info('[WhatsApp] No saved session found. Ready for manual QR connect.');
      return this.getStatus();
    }

    if (!this.hasSessionFiles()) {
      this._clearAuth();
    }

    logger.info('[WhatsApp] Initialising Baileys socket...');
    this.status = 'launching';
    this.destroyed = false;
    this._reconnectAttempt = 0;
    this._notifyListeners('status', { status: this.status });

    await this._createSocket();
    if (!autoStart) {
      await this._waitForQR(5000);
    }
    return this.getStatus();
  }

  async regenerateQR() {
    if (this.status === 'connected' && this.isReady) {
      throw new Error('WhatsApp is already connected. Disconnect first to link another account.');
    }
    if (this.hasSessionFiles()) {
      throw new Error('An active WhatsApp session is already paired. Please click Disconnect first if you want to link a new device.');
    }

    logger.info('[WhatsApp] Regenerating fresh QR code...');

    this._clearTimers();
    this._closeSocket(this.sock);
    this.sock = null;

    this._clearAuth();

    this.status = 'launching';
    this.latestQR = null;
    this.qrGeneratedAt = null;
    this.destroyed = false;
    this._reconnectAttempt = 0;

    this._notifyListeners('status', { status: 'launching', qr: null });

    await this._createSocket();
    await this._waitForQR(5000);
    return this.getStatus();
  }

  async _createSocket() {
    if (this.destroyed) return;

    this._closeSocket(this.sock);
    this.sock = null;

    fs.mkdirSync(this.sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
    await this._ensureVersion();

    const version = this._version || [2, 3000, 1043857760];
    const socketId = ++this._socketId;

    const browserIdentity = ['WhatsApp', 'Chrome', '3.0'];

    const sock = makeWASocket({
      version,
      logger: baileysLogger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
      },
      browser: browserIdentity,
      printQRInTerminal: false,
      keepAliveIntervalMs: 30_000,
      retryRequestDelayMs: 2_000,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
      fireInitQueries: true,
      maxMsgRetryCount: 5,
      emitOwnEvents: true,
      patchMessageBeforeSending: (message) => message,
    });

    this.sock = sock;

    sock.ev.on('creds.update', async (update) => {
      await saveCreds();

      if (!this.isReady && (this.status === 'qr_ready' || this.latestQR || this._qrWasShown)) {
        logger.info('[WhatsApp] 📱 QR code scanned by mobile phone! Switching to connecting state...');
        this.status = 'connecting';
        this.latestQR = null;
        if (this._qrExpireTimer) clearTimeout(this._qrExpireTimer);
        this._notifyListeners('status', { status: 'connecting', isScanning: true, qr: null });
      }
    });

    sock.ev.on('connection.update', async (update) => {
      if (socketId !== this._socketId) return;

      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const base64Png = await QRCode.toDataURL(qr, { scale: 6 });
          this.latestQR = base64Png;
          this.qrGeneratedAt = Date.now();
          this._qrWasShown = true;
          this.status = 'qr_ready';
          this.isReady = false;
          this._reconnectAttempt = 0;

          if (this._qrExpireTimer) clearTimeout(this._qrExpireTimer);

          this._qrExpireTimer = setTimeout(() => {
            if (socketId !== this._socketId) return;
            if (
              this.latestQR === base64Png &&
              !this.isReady &&
              !this.destroyed &&
              this.status === 'qr_ready'
            ) {
              logger.info('[WhatsApp] Current QR expired. Auto-refreshing...');
              this.latestQR = null;
              this._notifyListeners('qr_expired', { status: 'launching', qr: null });
              this.regenerateQR().catch((err) => {
                logger.warn('[WhatsApp] Auto-regenerate error:', err.message);
              });
            }
          }, 55_000);

          logger.info('[WhatsApp] Fresh QR code ready for scanning');
          this._notifyListeners('qr', {
            qr: base64Png,
            status: this.status,
            qrGeneratedAt: this.qrGeneratedAt,
          });
        } catch (err) {
          logger.error(`[WhatsApp] QR generation failed: ${err.message}`);
        }
      }

      if (connection === 'connecting' || update.isNewLogin || update.isOnline || update.receivedPendingNotifications) {
        if (!this.isReady && (this.status === 'qr_ready' || this.latestQR || this._qrWasShown)) {
          logger.info('[WhatsApp] 📱 Connection update: QR scanned! Setting status to connecting...');
          this.status = 'connecting';
          this.latestQR = null;
          if (this._qrExpireTimer) clearTimeout(this._qrExpireTimer);
          this._notifyListeners('status', { status: 'connecting', isScanning: true, qr: null });
        }
      }

      if (connection === 'open') {
        this.isReady = true;
        this.latestQR = null;
        this.qrGeneratedAt = null;
        this._qrWasShown = false;   
        this.status = 'connected';
        this._reconnectAttempt = 0;

        if (this._qrExpireTimer) {
          clearTimeout(this._qrExpireTimer);
          this._qrExpireTimer = null;
        }
        if (this._autoRegenTimer) clearTimeout(this._autoRegenTimer);

        const userJid = sock.user?.id || '';
        this.userPhone = userJid.split(':')[0] || userJid.split('@')[0] || '';
        logger.info(`[WhatsApp] Connected successfully as ${this.userPhone} ✓`);
        this._notifyListeners('connected', { status: this.status, userPhone: this.userPhone });
      }

      if (connection === 'close') {
        if (socketId !== this._socketId) return;

        this.isReady = false;
        this.latestQR = null;
        this.qrGeneratedAt = null;

        if (this._qrExpireTimer) {
          clearTimeout(this._qrExpireTimer);
          this._qrExpireTimer = null;
        }

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reason = lastDisconnect?.error?.message || 'unknown';
        logger.warn(`[WhatsApp] Connection closed (code: ${statusCode}, reason: ${reason})`);

        if (this.destroyed) {
          this.status = 'disconnected';
          this.userPhone = null;
          this._qrWasShown = false;
          this._notifyListeners('status', { status: this.status });
          return;
        }

        if (statusCode === DisconnectReason.loggedOut) {
          logger.warn('[WhatsApp] Session logged out on phone. Clearing auth...');
          this._clearAuth();
          this.status = 'disconnected';
          this.userPhone = null;
          this._qrWasShown = false;
          this._notifyListeners('status', { status: this.status });
          return;
        }

        if (statusCode === DisconnectReason.restartRequired) {
          logger.info('[WhatsApp] 📱 Phone scanned QR code! (Restart required 515) Reopening socket in connecting mode...');
          this.status = 'connecting';
          this.latestQR = null;
          this._notifyListeners('status', { status: 'connecting', isScanning: true, qr: null });
          setTimeout(() => {
            if (socketId === this._socketId && !this.destroyed) {
              this._createSocket();
            }
          }, 1500);
          return;
        }

        if (this._reconnectAttempt < 10) {
          this._reconnectAttempt++;
        }
        const delay = Math.min(1500 * Math.pow(2, this._reconnectAttempt), 30_000);
        logger.info(`[WhatsApp] Reconnecting in ${delay}ms (attempt ${this._reconnectAttempt}, reason: ${reason}, code: ${statusCode})...`);
        this.status = 'connecting';
        this._notifyListeners('status', { status: this.status });
        this._scheduleReconnect(delay);
      }
    });

    sock.ev.on('messages.upsert', () => {});
    sock.ev.on('messages.update', () => {});
    sock.ev.on('message-receipt.update', () => {});
    sock.ev.on('messaging-history.set', () => {});
  }

  _scheduleReconnect(delay) {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
    }
    this._reconnectTimer = setTimeout(() => {
      if (!this.destroyed) {
        this._createSocket().catch((err) => {
          logger.error(`[WhatsApp] Reconnect failed: ${err.message}`);
          if (this._reconnectAttempt < 10) {
            this._reconnectAttempt++;
          }
          const nextDelay = Math.min(1500 * Math.pow(2, this._reconnectAttempt), 30_000);
          this._scheduleReconnect(nextDelay);
        });
      }
    }, delay);
  }

  async sendTextMessage(number, message) {
    if (!this.isReady || !this.sock) {
      throw new Error('WhatsApp is not connected. Please scan QR code first.');
    }
    if (!number || !String(number).trim()) {
      throw new Error('Customer mobile number is required.');
    }
    if (!message || !String(message).trim()) {
      throw new Error('Message text is required.');
    }

    let cleanNumber = String(number).trim().replace(/[^0-9]/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = '91' + cleanNumber;
    }
    let jid = toJid(cleanNumber);
    if (!jid) {
      throw new Error('Invalid mobile number format.');
    }

    const cleanText = String(message).trim();

    return this.messageQueue.enqueue(async () => {
      if (!this.isReady || !this.sock) {
        throw new Error('WhatsApp disconnected while message was waiting in queue.');
      }

      try {
        let targetJid = jid;
        try {
          const results = await this.sock.onWhatsApp(cleanNumber);
          if (results && results.length > 0 && results[0]?.exists) {
            targetJid = results[0].jid;
          }
        } catch (err) {
          logger.warn(`[WhatsApp] onWhatsApp check fallback for ${cleanNumber}: ${err.message}`);
        }

        const isSelf = this.userPhone && (cleanNumber === this.userPhone || targetJid.includes(this.userPhone));

        if (!isSelf) {
          try {
            await this.sock.presenceSubscribe(targetJid);
          } catch (_) {}
          await sleep(300 + Math.floor(Math.random() * 250));

          try {
            await this.sock.sendPresenceUpdate('composing', targetJid);
          } catch (_) {}

          const typingDelay = Math.min(Math.max(cleanText.length * 25, 1000), 2200) + Math.floor(Math.random() * 300);
          await sleep(typingDelay);

          try {
            await this.sock.sendPresenceUpdate('paused', targetJid);
          } catch (_) {}
          await sleep(150);
        } else {
          await sleep(250);
        }

        const result = await this.sock.sendMessage(targetJid, { text: cleanText });
        logger.info(`[WhatsApp] Message sent to ${cleanNumber} (${targetJid}, ID: ${result?.key?.id})`);
        return {
          success: true,
          messageId: result?.key?.id,
          jid: targetJid,
        };
      } catch (err) {
        logger.error(`[WhatsApp] Failed to send message to ${cleanNumber}: ${err.message}`);
        throw err;
      }
    });
  }

  getStatus() {
    return {
      status: this.status,
      isReady: this.isReady,
      hasQR: !!this.latestQR,
      qr: this.latestQR,
      qrGeneratedAt: this.qrGeneratedAt,
      userPhone: this.userPhone,
      hasSavedSession: this.hasSessionFiles(),
      queuePending: this.messageQueue.getPendingCount(),
    };
  }

  async disconnect() {
    logger.info('[WhatsApp] Full disconnect and unpair requested by user.');
    this._clearTimers();

    if ((!this.sock || !this.isReady) && this.hasSessionFiles()) {
      try {
        logger.info('[WhatsApp] Reconnecting temporary socket to unlink companion device from WhatsApp server...');
        this.destroyed = false;
        await this._createSocket();
        const start = Date.now();
        while (!this.isReady && Date.now() - start < 3500) {
          await sleep(200);
        }
      } catch (err) {
        logger.warn(`[WhatsApp] Temporary socket connection failed: ${err.message}`);
      }
    }

    if (this.sock) {
      const jid = this.sock.user?.id || this.sock.authState?.creds?.me?.id;
      logger.info(`[WhatsApp] Unlinking device for JID: ${jid || 'unknown'}...`);

      if (jid) {
        try {
          await Promise.race([
            this.sock.query({
              tag: 'iq',
              attrs: {
                to: 's.whatsapp.net',
                type: 'set',
                xmlns: 'md',
              },
              content: [
                {
                  tag: 'remove-companion-device',
                  attrs: {
                    jid,
                    reason: 'user_initiated',
                  },
                },
              ],
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Unlink IQ timeout (4s)')), 4000)),
          ]);
          logger.info('[WhatsApp] Device unlinked from WhatsApp server successfully ✓');
        } catch (err) {
          logger.warn(`[WhatsApp] Unlink IQ notice: ${err.message}`);
        }
      }

      try {
        await Promise.race([
          this.sock.logout('User initiated disconnect'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout (3s)')), 3000)),
        ]);
        logger.info('[WhatsApp] Baileys sock.logout completed.');
      } catch (err) {
        logger.warn(`[WhatsApp] sock.logout notice: ${err.message}`);
      }
      await sleep(500);
      this._closeSocket(this.sock);
      this.sock = null;
    }

    this.destroyed = true;
    this.isReady = false;
    this.status = 'disconnected';
    this.latestQR = null;
    this.qrGeneratedAt = null;
    this.userPhone = null;
    this._qrWasShown = false;

    await sleep(200);
    this._clearAuth();

    this._notifyListeners('status', { status: 'disconnected', qr: null, userPhone: null });
    logger.info('[WhatsApp] WhatsApp completely disconnected, unlinked from phone, and session cleared.');
    return { success: true, message: 'WhatsApp session unlinked and removed successfully.' };
  }

  _clearAuth() {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.rmSync(this.sessionPath, { recursive: true, force: true });
        logger.info('[WhatsApp] Session directory removed from disk.');
      }
    } catch (err) {
      logger.warn(`[WhatsApp] Could not clear auth folder: ${err.message}`);
    }
  }
}

export const whatsappService = new WhatsAppService();
