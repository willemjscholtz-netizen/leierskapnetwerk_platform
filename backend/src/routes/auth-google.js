const express = require('express');
const crypto = require('crypto');

const pool = require('../db/pool');
const { skepToestemmingsUrl, ruilKodeOm } = require('../auth/google');
const { skepSessie, stelKoekie } = require('../auth/session');

const router = express.Router();

const STATE_KOEKIE = 'lnp_oauth_state';

// ---------------------------------------------------------------
// GET /api/auth/google
//
// Stuur die gebruiker na Google se aanmeldskerm. Ons stoor 'n
// ewekansige state in 'n koekie en verwag dit terug - dit keer
// dat iemand 'n kwaadwillige callback aanstuur.
// ---------------------------------------------------------------
router.get('/', (req, res) => {
  let url;

  try {
    const state = crypto.randomBytes(16).toString('hex');

    res.cookie(STATE_KOEKIE, state, {
      httpOnly: true,
      sameSite: 'lax',           // 'lax' is nodig: Google stuur die
                                 // gebruiker terug met 'n gewone
                                 // topvlak-navigasie, en 'strict'
                                 // sou die koekie dan weier.
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000,    // 10 minute is genoeg om in te teken
      path: '/',
    });

    url = skepToestemmingsUrl(state);
  } catch (err) {
    console.error(err);
    return res.status(500).send(page('Kon nie met Google verbind nie', err.message));
  }

  res.redirect(url);
});

// ---------------------------------------------------------------
// GET /api/auth/google/callback
//
// Google stuur die gebruiker hierheen terug met 'n kode.
//
// OPSIE A: as die e-posadres al 'n rekening het, koppel ons die
// twee. Die gebruiker hou een rekening en kan met beide metodes
// inteken.
// ---------------------------------------------------------------
router.get('/callback', async (req, res) => {
  const { code, state, error: googleFout } = req.query;

  const stateKoekie = req.cookies?.[STATE_KOEKIE];
  res.clearCookie(STATE_KOEKIE, { path: '/' });

  try {
    // Die gebruiker het op "kanselleer" gedruk by Google
    if (googleFout) {
      return res.status(400).send(
        page('Aanmelding gekanselleer', 'Jy het nie toegang gegee nie. Probeer weer.')
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
      //
      // Die rekening bestaan al. Ons verander NIE auth_provider
      // nie - die mens kan steeds met hul wagwoord inteken. Ons
      // merk net die e-pos as bevestig, want Google het dit
      // reeds bevestig.
      gebruiker = bestaande.rows[0];

      await pool.query(
        `update public.users
            set email_verified = true, updated_at = now()
          where id = $1`,
        [gebruiker.id]
      );

      gebruiker = { ...gebruiker, email_verified: true };

      console.log(
        `Google-aanmelding: gekoppel aan bestaande rekening ${gebruiker.id} ` +
        `(${profiel.epos}, provider was ${gebruiker.auth_provider})`
      );
    } else {
      // --- Nuwe rekening via Google ---------------------------
      const ingevoeg = await pool.query(
        `insert into public.users
           (email, password_hash, first_name, last_name, auth_provider, email_verified)
         values ($1, null, $2, $3, 'google', true)
         returning id, email, first_name, last_name, auth_provider, email_verified`,
        [profiel.epos, profiel.voornaam ?? '', profiel.van ?? '']
      );

      gebruiker = ingevoeg.rows[0];
      console.log(`Google-aanmelding: nuwe rekening ${gebruiker.id} (${profiel.epos})`);
    }

    // --- Sessie, presies soos met e-pos-aanmelding ------------
    const sessie = await skepSessie(gebruiker.id, true, req);
    stelKoekie(res, sessie);

    // --- Terug na die frontend --------------------------------
    //
    // Ons stuur die gebruiker terug na die app, nie na 'n
    // JSON-antwoord nie. Die koekie is klaar gestel, so die app
    // sal hulle as ingeteken sien.
    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    res.redirect(frontend);
  } catch (err) {
    console.error('Google-aanmelding het gefaal:', err);
    res.status(500).send(
      page('Kon nie inteken nie', 'Probeer asseblief weer, of teken met jou e-posadres in.')
    );
  }
});

// 'n Eenvoudige bladsy vir die gevalle waar iets misgaan.
// Die gebruiker sien dit in die blaaier, nie as JSON nie.
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
