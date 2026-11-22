require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const pool = require('./db/pool');
const { laaiGebruiker } = require('./auth/session');
const authRouter = require('./routes/auth');
const authGoogleRouter = require('./routes/auth-google');
const authMetaRouter = require('./routes/auth-meta');
const profielRouter = require('./routes/profiel');
const profielVolledigheidRouter = require('./routes/profiel-volledigheid');
const profielPrentRouter = require('./routes/profiel-prent');
const profielVoorkeureRouter = require('./routes/voorkeure');

const app = express();

// credentials: true is nodig sodat die blaaier die sessie-koekie
// saamstuur. Sonder dit werk inteken nie oor CORS nie.
app.use(cors({ origin: true, credentials: true }));

// Die profielprent kom as 'n base64-datastring. base64 is omtrent
// 33% groter as die rou grepe, so 400 KB rou word ~545 KB op die draad.
// Sonder hierdie limiet weier Express enige prent oor 100 KB met 'n 413.
app.use(express.json({ limit: '2mb' }));

app.use(cookieParser());

// Laai die ingetekende gebruiker op elke versoek (of niks, as
// daar geen geldige sessie is nie). Alle roetes kry dit verniet.
app.use(laaiGebruiker);

// Die toetsblad in public/ (net vir ontwikkeling)
app.use(express.static('public'));

// Gesondheidskontrole - bewys die databasis antwoord
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('select now() as tyd');
    res.json({ ok: true, tyd: result.rows[0].tyd });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Databasis antwoord nie' });
  }
});

app.use('/api/auth/google', authGoogleRouter);
app.use('/api/auth/meta', authMetaRouter);
app.use('/api/auth', authRouter);
app.use('/api/profiel/volledigheid', profielVolledigheidRouter);
app.use('/api/profiel/prent', profielPrentRouter);
app.use('/api/profiel/voorkeure', profielVoorkeureRouter);
app.use('/api/profiel', profielRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend loop op http://localhost:${PORT}`);
  console.log('Roetes: /api/health, /api/auth/*, /api/auth/google/*, /api/auth/meta/*, /api/profiel/*');
});
