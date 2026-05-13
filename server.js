const express = require('express');
const cors = require('cors');
const path = require('path');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Multi-session store
const sessions = {};

async function createSession(userId) {
  if (sessions[userId]?.initializing || sessions[userId]?.ready) return;
  sessions[userId] = { client: null, qr: null, ready: false, phone: '', initializing: true };

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: `mans-${userId}`, dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage',
             '--no-zygote','--single-process','--disable-gpu','--disable-extensions']
    }
  });

  sessions[userId].client = client;

  client.on('qr', async (qr) => {
    sessions[userId].qr = await qrcode.toDataURL(qr);
    sessions[userId].ready = false;
  });

  client.on('ready', async () => {
    sessions[userId].ready = true;
    sessions[userId].qr = null;
    sessions[userId].initializing = false;
    sessions[userId].phone = client.info?.wid?.user || '';
    console.log(`[${userId}] WhatsApp connected: +${sessions[userId].phone}`);
  });

  client.on('disconnected', () => {
    sessions[userId] = { client: null, qr: null, ready: false, phone: '', initializing: false };
  });

  client.on('auth_failure', () => {
    sessions[userId].initializing = false;
    sessions[userId].ready = false;
  });

  try { await client.initialize(); }
  catch(e) { sessions[userId].initializing = false; }
}

// ===== ROUTES =====

app.get('/status/:uid', (req, res) => {
  const s = sessions[req.params.uid];
  res.json(s ? { ready: s.ready, qr: s.qr, phone: s.phone, initializing: s.initializing } : { ready: false, qr: null, phone: '', initializing: false });
});

app.get('/all-sessions', (req, res) => {
  const out = {};
  for (const uid in sessions) out[uid] = { ready: sessions[uid].ready, phone: sessions[uid].phone };
  res.json(out);
});

app.post('/connect/:uid', async (req, res) => {
  const { uid } = req.params;
  if (!sessions[uid]?.ready && !sessions[uid]?.initializing) createSession(uid);
  res.json({ success: true });
});

app.post('/disconnect/:uid', async (req, res) => {
  const { uid } = req.params;
  if (sessions[uid]?.client) await sessions[uid].client.destroy().catch(() => {});
  delete sessions[uid];
  res.json({ success: true });
});

app.post('/send/:uid', async (req, res) => {
  const s = sessions[req.params.uid];
  if (!s?.ready) return res.status(400).json({ success: false, error: 'Not connected' });
  try {
    await s.client.sendMessage(req.body.phone.replace(/\D/g,'') + '@c.us', req.body.message);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/send-media/:uid', async (req, res) => {
  const s = sessions[req.params.uid];
  if (!s?.ready) return res.status(400).json({ success: false, error: 'Not connected' });
  const { phone, message, mediaBase64, mediaType, mediaName } = req.body;
  try {
    const chatId = phone.replace(/\D/g,'') + '@c.us';
    if (mediaBase64) {
      const media = new MessageMedia(mediaType || 'image/jpeg', mediaBase64, mediaName || 'file');
      await s.client.sendMessage(chatId, media, { caption: message || '' });
    } else {
      await s.client.sendMessage(chatId, message);
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`MANS SENDER running on port ${PORT}`));
