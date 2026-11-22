const express = require('express');
const pool = require('../db/pool');
const { vereisInteken } = require('../auth/session');

const router = express.Router();

router.use(vereisInteken);

// ---------------------------------------------------------------
// GET /api/profiel/voorkeure
//
// Gee die hele katalogus - 20 velde met hul opsies - saam met die
// gebruiker se keuses. Die frontend kan alles uit hierdie een
// antwoord teken; geen tweede versoek nodig nie.
// ---------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const velde = await pool.query(
      `select id, kode, naam, volgorde
         from public."Belangstellingsveld"
        where aktief = true
        order by volgorde, naam`
    );

    const opsies = await pool.query(
      `select b.id, b.belangstellingsveld_id, b.kode, b.naam, b.volgorde
         from public."Belangstellings" b
        where b.aktief = true
        order by b.volgorde, b.naam`
    );

    const gekies = await pool.query(
      `select belangstelling_id
         from public."Gebruiker_Belangstellings"
        where gebruiker_id = $1`,
      [req.gebruiker.id]
    );

    const gekoseIds = new Set(gekies.rows.map((r) => String(r.belangstelling_id)));

    const perVeld = new Map();
    for (const v of velde.rows) {
      perVeld.set(v.id, {
        id: v.id,
        kode: v.kode,
        naam: v.naam,
        volgorde: v.volgorde,
        opsies: [],
      });
    }

    for (const o of opsies.rows) {
      const veld = perVeld.get(o.belangstellingsveld_id);
      if (!veld) continue;
      veld.opsies.push({
        id: o.id,
        kode: o.kode,
        naam: o.naam,
        gekies: gekoseIds.has(String(o.id)),
      });
    }

    res.json({
      velde: Array.from(perVeld.values()),
      gekiesTelling: gekoseIds.size,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kon nie die voorkeure lees nie' });
  }
});

// ---------------------------------------------------------------
// PUT /api/profiel/voorkeure
//
// Vervang die gebruiker se keuses met die lys wat gestuur word.
// Een ry per ID. Alles in een transaksie: as een ID sleg is,
// bly die ou keuses staan.
// ---------------------------------------------------------------
router.put('/', async (req, res) => {
  const { belangstellingIds } = req.body ?? {};

  if (!Array.isArray(belangstellingIds)) {
    return res.status(400).json({ error: 'belangstellingIds moet \'n lys wees' });
  }

  // Los nommers en stringe deur, maar niks anders nie.
  const skoon = [];
  for (const id of belangstellingIds) {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0) {
      return res.status(400).json({ error: `Ongeldige belangstelling-ID: ${id}` });
    }
    skoon.push(n);
  }

  const uniek = [...new Set(skoon)];

  if (uniek.length > 500) {
    return res.status(400).json({ error: 'Te veel keuses' });
  }

  const kliënt = await pool.connect();
  try {
    await kliënt.query('begin');

    // Kyk dat elke ID werklik bestaan. Anders kry die gebruiker
    // 'n vreemde-sleutel-fout wat niks sê.
    if (uniek.length) {
      const bestaan = await kliënt.query(
        `select count(*)::int as n
           from public."Belangstellings"
          where id = any($1::bigint[])`,
        [uniek]
      );
      if (bestaan.rows[0].n !== uniek.length) {
        await kliënt.query('rollback');
        return res.status(400).json({ error: 'Een of meer belangstellings bestaan nie' });
      }
    }

    // Vervang: verwyder alles, sit die nuwe lys in.
    await kliënt.query(
      'delete from public."Gebruiker_Belangstellings" where gebruiker_id = $1',
      [req.gebruiker.id]
    );

    if (uniek.length) {
      await kliënt.query(
        `insert into public."Gebruiker_Belangstellings"
           (gebruiker_id, belangstelling_id)
         select $1, x
           from unnest($2::bigint[]) as x`,
        [req.gebruiker.id, uniek]
      );
    }

    await kliënt.query('commit');
    res.json({ ok: true, gekiesTelling: uniek.length });
  } catch (err) {
    await kliënt.query('rollback');
    console.error(err);
    res.status(500).json({ error: 'Kon nie die voorkeure stoor nie' });
  } finally {
    kliënt.release();
  }
});

module.exports = router;
