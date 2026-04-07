// parallel_dialer_gohighlevel_starter.js

const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL; 
const APP_PASSWORD = process.env.APP_PASSWORD || 'changeme';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const FROM = process.env.TWILIO_PHONE_NUMBER;
const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

const activeSessions = new Map();

function requireAuth(req, res, next) {
const auth = req.headers.authorization || '';
if (auth !== `Bearer ${APP_PASSWORD}`) {
return res.status(401).json({ error: 'Unauthorized' });
}
next();
}

function normalizePhone(phone) {
if (!phone) return '';
const digits = String(phone).replace(/\D/g, '');
if (digits.length === 11 && digits.startsWith('1')) return +`${digits}`;
if (String(phone).startsWith('+')) return String(phone);
return +${digits};
}

async function addNoteToHighLevel(contactId, body) {
if (!contactId || !GHL_API_KEY) return;
try {
await fetch(https://services.leadconnectorhq.com/contacts/${contactId}/notes, {
method: 'POST',
headers: {
Authorization: Bearer ${GHL_API_KEY},
Version: '2021-07-28',
'Content-Type': 'application/json'
},
body: JSON.stringify({ body, locationId: GHL_LOCATION_ID })
});
} catch (e) {
console.error('GHL note error', e.message);
}
}

app.get('/', (req, res) => {
res.type('html').send(`

<h1>Parallel Dialer Ready</h1> <p>Paste numbers and test your dialer.</p> `); });

app.post('/api/dial', requireAuth, async (req, res) => {
try {
const leadName = req.body.leadName || 'Unknown Lead';
const contactId = req.body.contactId || '';
const whisper = req.body.whisper || '';
const numbers = (req.body.numbers || []).map(normalizePhone).filter(Boolean).slice(0, 10);

if (!numbers.length) {
  return res.status(400).json({ error: 'At least one phone number is required.' });
}

const sessionId = 'sess_' + Date.now();
activeSessions.set(sessionId, {
  leadName,
  contactId,
  numbers,
  completed: false
});

const calls = await Promise.all(numbers.map(async (to) => {
  const call = await client.calls.create({
    to,
    from: FROM,
    url: `${BASE_URL}/twiml?sessionId=${sessionId}`
  });
  return { to, callSid: call.sid };
}));

await addNoteToHighLevel(contactId, `Parallel dial started for ${leadName}`);
res.json({ ok: true, sessionId, calls });

} catch (e) {
console.error(e);
res.status(500).json({ error: e.message });
}
});

app.post('/twiml', (req, res) => {
const twiml = new twilio.twiml.VoiceResponse();
twiml.say('Press 1 to claim this call');
twiml.gather({
numDigits: 1,
action: '/claim',
method: 'POST'
});
res.type('text/xml').send(twiml.toString());
});

app.post('/claim', (req, res) => {
const twiml = new twilio.twiml.VoiceResponse();
twiml.say('You got the call');
res.type('text/xml').send(twiml.toString());
});

app.listen(PORT, () => {
console.log(Server running on ${PORT});
});
