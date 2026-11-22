const express = require('express');
const pool = require('../db/pool');

const { wagwoordSterkteFoute, hashWagwoord, vergelykWagwoord } = require('../auth/password');
const {
  KOEKIE_NAAM, skepSessie, verwyderSessie,
  stelKoekie, verwyderKoekie, vereisInteken,
} = require('../auth/session');
const { verifieerRecaptcha } = require('../auth/recaptcha');
const { skepBevestigingstoken, wisselBevestigingstoken } = require('../auth/email-token');
const { stuurBevestiging } = require('../email/mailer');

const router = express.Router();

// E-posadresse word altyd in kleinletters gestoor, want
// Jan@Voorbeeld.co.za en jan@voorbeeld.co.za is dieselfde persoon.
function normaliseerEpos(e) {
  return String(e ?? '').trim().toLowerCase();
}

function berekenOuderdom(geboortedatum) {
  if (!geboortedatum) return null;
  const geboorte = new Date(geboortedatum);
  if (Number.isNaN(geboorte.getTime())) return null;

  const nou = new Date();
  let ouderdom = nou.getUTCFullYear() - geboorte.getUTCFullYear();
  const maandVerskil = nou.getUTCMonth() - geboorte.getUTCMonth();
  if (maandVerskil < 0 || (maandVerskil === 0 && nou.getUTCDate() < geboorte.getUTCDate())) {
    ouderdom--;
  }
  return ouderdom;
}

// ---------------------------------------------------------------
// POST /api/auth/registreer
// ---------------------------------------------------------------
router.post('/registreer', async (req, res) => {
  const {
    email, password, firstName, lastName, contactNumber,
    dateOfBirth, gender, locationLat, locationLng, locationText,
    recaptchaToken,
  } = req.body ?? {};

  try {
    // --- 1. Captcha eerste, voor enigiets duurs -----------------
    const captcha = await verifieerRecaptcha(recaptchaToken, req.ip);
    if (!captcha.ok) {
      return res.status(400).json({ error: captcha.rede ?? 'Captcha het misluk' });
    }

    // --- 2. Verpligte velde -------------------------------------
    const epos = normaliseerEpos(email);
    const ontbreek = [];
    if (!epos) ontbreek.push('e-posadres');
    if (!firstName?.trim()) ontbreek.push('naam');
    if (!lastName?.trim()) ontbreek.push('van');
    if (ontbreek.length) {
      return res.status(400).json({ error: `Ontbreek: ${ontbreek.join(', ')}` });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epos)) {
      return res.status(400).json({ error: 'E-posadres lyk nie reg nie' });
    }

    // --- 3. Wagwoord-sterkte ------------------------------------
    const sterkteFoute = wagwoordSterkteFoute(password);
    if (sterkteFoute.length) {
      return res.status(400).json({
        error: 'Wagwoord is nie sterk genoeg nie',
        details: sterkteFoute,
      });
    }

    // --- 4. Bestaan die e-pos al? -------------------------------
    const bestaande = await pool.query(
      'select id from public.users where email = $1',
      [epos]
    );
    if (bestaande.rows.length) {
      return res.status(409).json({ error: 'Hierdie e-posadres is al geregistreer' });
    }

    // --- 5. Hash en skryf ---------------------------------------
    const hash = await hashWagwoord(password);
    const ouderdom = berekenOuderdom(dateOfBirth);

    const ingevoeg = await pool.query(
      `insert into public.users
         (email, password_hash, first_name, last_name, contact_number,
          date_of_birth, age, gender, location_lat, location_lng, location_text,
          auth_provider, email_verified)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'local',false)
       returning id, email, first_name, last_name, created_at`,
      [
        epos, hash, firstName.trim(), lastName.trim(), contactNumber ?? null,
        dateOfBirth ?? null, ouderdom, gender ?? null,
        locationLat ?? null, locationLng ?? null, locationText ?? null,
      ]
    );

    const gebruiker = ingevoeg.rows[0];

    // --- 6. Bevestigingstoken en e-pos --------------------------
    const token = await skepBevestigingstoken(gebruiker.id);

    try {
      await stuurBevestiging(epos, gebruiker.first_name, token);
    } catch (mailFout) {
      // Die rekening is geskep. Ons wil nie die hele registrasie
      // ongedaan maak oor 'n e-pos wat nie gestuur kon word nie.
      console.error('Bevestigings-e-pos kon nie gestuur word nie:', mailFout.message);
      return res.status(201).json({
        user: gebruiker,
        emailSent: false,
        warning: 'Rekening geskep, maar die bevestigings-e-pos kon nie gestuur word nie.',
      });
    }

    res.status(201).json({ user: gebruiker, emailSent: true });
  } catch (err) {
    console.error('Registrasie het gefaal:', err);
    res.status(500).json({ error: 'Kon nie die rekening skep nie' });
  }
});

// ---------------------------------------------------------------
// GET /api/auth/bevestig?token=...
// ---------------------------------------------------------------
router.get('/bevestig', async (req, res) => {
  try {
    const userId = await wisselBevestigingstoken(req.query.token);

    if (!userId) {
      return res.status(400).send(`
        <html><body style="font-family:system-ui;max-width:520px;margin:3rem auto">
          <h2>Die skakel werk nie</h2>
          <p>Die skakel is dalk reeds gebruik, of het verval. Teken in en vra 'n nuwe een aan.</p>
        </body></html>`);
    }

    await pool.query(
      'update public.users set email_verified = true, updated_at = now() where id = $1',
      [userId]
    );

    res.send(`
      <html><body style="font-family:system-ui;max-width:520px;margin:3rem auto">
        <h2>Jou e-pos is bevestig</h2>
        <p>Dankie. Jy kan nou inteken.</p>
      </body></html>`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Kon nie die e-pos bevestig nie');
  }
});

// ---------------------------------------------------------------
// POST /api/auth/teken-in
// ---------------------------------------------------------------
router.post('/teken-in', async (req, res) => {
  const { email, password, rememberMe, recaptchaToken } = req.body ?? {};

  try {
    const captcha = await verifieerRecaptcha(recaptchaToken, req.ip);
    if (!captcha.ok) {
      return res.status(400).json({ error: captcha.rede ?? 'Captcha het misluk' });
    }

    const epos = normaliseerEpos(email);
    if (!epos || !password) {
      return res.status(400).json({ error: 'E-posadres en wagwoord is verpligtend' });
    }

    const result = await pool.query(
      `select id, email, password_hash, first_name, last_name, email_verified, auth_provider
         from public.users where email = $1`,
      [epos]
    );

    // Dieselfde boodskap vir "geen rekening" en "verkeerde wagwoord".
    // Anders kan iemand uitvind watter e-posadresse bestaan.
    const algemeneFout = { error: 'E-posadres of wagwoord is verkeerd' };

    if (result.rows.length === 0) return res.status(401).json(algemeneFout);

    const gebruiker = result.rows[0];
    const reg = await vergelykWagwoord(password, gebruiker.password_hash);
    if (!reg) return res.status(401).json(algemeneFout);

    if (!gebruiker.email_verified) {
      return res.status(403).json({
        error: 'Bevestig eers jou e-posadres. Kyk in jou inkassie vir die bevestigingskakel.',
      });
    }

    const sessie = await skepSessie(gebruiker.id, Boolean(rememberMe), req);
    stelKoekie(res, sessie);

    res.json({
      user: {
        id: gebruiker.id,
        email: gebruiker.email,
        first_name: gebruiker.first_name,
        last_name: gebruiker.last_name,
      },
      expiresAt: sessie.expiresAt,
    });
  } catch (err) {
    console.error('Inteken het gefaal:', err);
    res.status(500).json({ error: 'Kon nie inteken nie' });
  }
});

// ---------------------------------------------------------------
// POST /api/auth/teken-uit
// ---------------------------------------------------------------
router.post('/teken-uit', async (req, res) => {
  try {
    await verwyderSessie(req.cookies?.[KOEKIE_NAAM]);
    verwyderKoekie(res);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kon nie uitteken nie' });
  }
});

// ---------------------------------------------------------------
// GET /api/auth/ek - wie is ingeteken?
// ---------------------------------------------------------------
router.get('/ek', vereisInteken, (req, res) => {
  res.json({ user: req.gebruiker, sessieVerval: req.sessie.expiresAt });
});

module.exports = router;
