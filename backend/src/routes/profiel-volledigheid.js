const express = require('express');
const pool = require('../db/pool');
const { vereisInteken } = require('../auth/session');
const { VELDE, ontbrekendeVelde } = require('../auth/volledigheid');

const router = express.Router();

router.use(vereisInteken);

// ---------------------------------------------------------------
// GET /api/profiel/volledigheid
//
// Gee die velde wat nog ontbreek, in die vorm wat die frontend
// nodig het om die skerm te teken.
// ---------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `select first_name, last_name, contact_number, date_of_birth,
              gender, location_lat, location_lng, location_text
         from public.users
        where id = $1`,
      [req.gebruiker.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gebruiker bestaan nie meer nie' });
    }

    const ontbreek = ontbrekendeVelde(result.rows[0]);

    res.json({
      volledig: ontbreek.length === 0,
      ontbreek: ontbreek.map((v) => v.naam),
      velde: ontbreek,
      totaalVelde: VELDE.length,
      ontbreekTelling: ontbreek.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kon nie die profiel nagaan nie' });
  }
});

module.exports = router;
