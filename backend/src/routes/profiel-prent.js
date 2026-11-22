const express = require('express');
const pool = require('../db/pool');
const { vereisInteken } = require('../auth/session');

const router = express.Router();

router.use(vereisInteken);

const TOEGELATE_TIPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAKS_GREPE = 500 * 1024;   // 500 KB - ruim genoeg vir 400x400

// Die prent kom as "data:image/png;base64,iVBOR..."
function ontleedDatastring(data) {
  if (typeof data !== 'string') return { fout: 'Geen prent ontvang nie' };

  const pas = /^data:([a-z/+.-]+);base64,(.+)$/i.exec(data);
  if (!pas) return { fout: 'Die prent is nie in die regte formaat nie' };

  const tipe = pas[1].toLowerCase();
  const basis64 = pas[2];

  if (!TOEGELATE_TIPES.includes(tipe)) {
    return { fout: 'Net PNG, JPEG of WebP word aanvaar' };
  }

  const grepe = Math.ceil((basis64.length * 3) / 4);
  if (grepe > MAKS_GREPE) {
    return {
      fout: `Die prent is te groot (${Math.round(grepe / 1024)} KB). Maksimum is 500 KB.`,
    };
  }

  return { tipe, grepe };
}

// PUT /api/profiel/prent - stoor
router.put('/', async (req, res) => {
  const { data } = req.body ?? {};

  const ontleed = ontleedDatastring(data);
  if (ontleed.fout) return res.status(400).json({ error: ontleed.fout });

  try {
    await pool.query(
      `update public.users
          set profile_photo = $1, updated_at = now()
        where id = $2`,
      [data, req.gebruiker.id]
    );

    res.json({ ok: true, grepe: ontleed.grepe, tipe: ontleed.tipe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kon nie die prent stoor nie' });
  }
});

// DELETE /api/profiel/prent - verwyder
router.delete('/', async (req, res) => {
  try {
    await pool.query(
      `update public.users
          set profile_photo = null, updated_at = now()
        where id = $1`,
      [req.gebruiker.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kon nie die prent verwyder nie' });
  }
});

module.exports = router;
