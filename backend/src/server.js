require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db/pool');
const notesRouter = require('./routes/notes');

const app = express();

app.use(cors());
app.use(express.json());

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

app.use('/api/notes', notesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend loop op http://localhost:${PORT}`);
});
