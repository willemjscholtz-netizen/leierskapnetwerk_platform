const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/notes - lees alle notas, nuutste eerste
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'select id, title, body, created_at from notes order by id desc'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kon nie notas lees nie' });
  }
});

// POST /api/notes - skep 'n nuwe nota
router.post('/', async (req, res) => {
  const { title, body } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is verpligtend' });
  }
  try {
    const result = await pool.query(
      'insert into notes (title, body) values ($1, $2) returning id, title, body, created_at',
      [title, body ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kon nie nota skep nie' });
  }
});

module.exports = router;
