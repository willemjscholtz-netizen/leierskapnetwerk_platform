const express = require('express');
const crypto = require('crypto');

const pool = require('../db/pool');
const { skepToestemmingsUrl, ruilKodeOm } = require('../auth/meta');
const { skepSessie, stelKoekie } = require('../auth/session');

const router = express.Router();

const STATE_KOEKIE = 'lnp_meta_state';

// ---------------------------------------------------------------
// GET /api/auth/meta
// ---------------------------------------------------------------
router.get('/', (req, res) => {
  let url;

  try {
    const state = crypto.randomBytes(16).toString('hex');

    res.cookie(STATE_KOEKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,
      path: '/',
    });

    url = skepToestemmingsUrl(state);
  } catch (err) {
    console.error(err);
    return res.status(500).send(page('Kon nie met Meta verbind nie', err.message));
  }

  res.redirect(url);
});

// ---------------------------------------------------------------
// GET /api/auth/meta/callback
// ---------------------------------------------------------------
router.get('/callback', async (req, res) => {
  const { code, state, error: metaFout, error_description } = req.query;

  const stateKoekie = req.cookies?.[STATE_KOEKIE];
  res.clearCookie(STATE_KOEKIE, { path: '/' });

  try {
    // Die gebruiker het op "kanselleer" gedruk
    if (metaFout) {
      return res.status(400).send(
        page('Aanmelding gekanselleer',
             error_description ?? 'Jy het nie toegang gegee nie. Probeer weer.')
      );
    }

    if (!code) {
      return res.status(400).send(page('Geen kode ontvang nie', 'Probeer weer.'));
    }

    if (!state || !stateKoekie || state !== stateKoekie) {
      return res.status(400).send(
        page('Die versoek is nie geldig nie', 'Begin asseblief weer by die aanmeldblad.')
      );
    }

    const profiel = await ruilKodeOm(code);

    // --- Soek die gebruiker op e-posadres ----------------------
    const bestaande = await pool.query(
      `select id, email, first_name, last_name, auth_provider, email_verified
         from public.users where email = $1`,
      [profiel.epos]
    );

    let gebruiker;

    if (bestaande.rows.length > 0) {
      // --- OPSIE A: koppel die twee ---------------------------
      gebruiker = bestaande.rows[0];

      await pool.query(
        `update public.users
            set email_verified = true, updated_at = now()
          where id = $1`,
        [gebruiker.id]
      );

      gebruiker = { ...gebruiker, email_verified: true };
      console.log(
        `Meta-aanmelding: gekoppel aan bestaande rekening ${gebruiker.id} ` +
        `(${profiel.epos}, provider was ${gebruiker.auth_provider})`
      );
    } else {
      // --- Nuwe rekening via Meta -----------------------------
      const ingevoeg = await pool.query(
        `insert into public.users
           (email, password_hash, first_name, last_name, auth_provider, email_verified)
         values ($1, null, $2, $3, 'meta', true)
         returning id, email, first_name, last_name, auth_provider, email_verified`,
        [profiel.epos, profiel.voornaam ?? '', profiel.van ?? '']
      );

      gebruiker = ingevoeg.rows[0];
      console.log(`Meta-aanmelding: nuwe rekening ${gebruiker.id} (${profiel.epos})`);
    }

    // --- Sessie ------------------------------------------------
    const sessie = await skepSessie(gebruiker.id, true, req);
    stelKoekie(res, sessie);

    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    res.redirect(frontend);
  } catch (err) {
    console.error('Meta-aanmelding het gefaal:', err);

    // Die e-posadres wat ontbreek kry sy eie boodskap, want dit
    // is iets wat die mens self kan regmaak (in hul Facebook-
    // instellings), nie 'n fout aan ons kant nie.
    if (err.kode === 'GEEN_EPOS') {
      return res.status(400).send(page('Geen e-posadres by Meta nie', err.message));
    }

    res.status(500).send(
      page('Kon nie inteken nie', 'Probeer asseblief weer, of teken met jou e-posadres in.')
    );
  }
});

function page(titel, boodskap) {
  return `<!DOCTYPE html>
<html lang="af">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titel}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 520px;
           margin: 3rem auto; padding: 0 1rem; line-height: 1.6; color: #2C3247; }
    h1 { font-size: 1.35rem; }
    a { color: #A33234; }
  </style>
</head>
<body>
  <h1>${titel}</h1>
  <p>${boodskap}</p>
  <p><a href="http://localhost:5173">Terug na die platform</a></p>
</body>
</html>`;
}

module.exports = router;
