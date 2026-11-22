const express = require('express');
const pool = require('../db/pool');

const { wagwoordSterkteFoute, hashWagwoord, vergelykWagwoord } = require('../auth/password');
const { vereisInteken, verwyderAlleSessies, KOEKIE_NAAM } = require('../auth/session');

const router = express.Router();

// Alles in hierdie lêer vereis 'n ingetekende gebruiker
router.use(vereisInteken);

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
// GET /api/profiel - die gebruiker se eie inligting
// ---------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `select id, email, first_name, last_name, contact_number,
              date_of_birth, age, gender,
              location_lat, location_lng, location_text,
              auth_provider, email_verified, profile_photo,
              location_accuracy, location_updated_at,
              created_at, updated_at
         from public.users
        where id = $1`,
      [req.gebruiker.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gebruiker bestaan nie meer nie' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kon nie die profiel lees nie' });
  }
});

// ---------------------------------------------------------------
// PATCH /api/profiel - werk die profiel by
// ---------------------------------------------------------------
router.patch('/', async (req, res) => {
  const {
    firstName, lastName, contactNumber,
    dateOfBirth, gender,
    locationLat, locationLng, locationText,
  } = req.body ?? {};

  // Ons bou die UPDATE uit die velde wat WERKLIK gestuur is.
  // 'n Veld wat nie gestuur is nie, word nie aangeraak nie - so
  // 'n gedeeltelike opdatering is veilig.
  const stukke = [];
  const waardes = [];

  function stel(kolom, waarde) {
    waardes.push(waarde);
    stukke.push(`${kolom} = $${waardes.length}`);
  }

  if (firstName !== undefined) {
    if (!String(firstName).trim()) {
      return res.status(400).json({ error: 'Naam mag nie leeg wees nie' });
    }
    stel('first_name', String(firstName).trim());
  }

  if (lastName !== undefined) {
    if (!String(lastName).trim()) {
      return res.status(400).json({ error: 'Van mag nie leeg wees nie' });
    }
    stel('last_name', String(lastName).trim());
  }

  if (contactNumber !== undefined) stel('contact_number', contactNumber || null);
  if (gender !== undefined) stel('gender', gender || null);
  if (locationText !== undefined) stel('location_text', locationText || null);

  if (locationLat !== undefined) {
    const v = locationLat === null ? null : Number(locationLat);
    if (v !== null && (!Number.isFinite(v) || v < -90 || v > 90)) {
      return res.status(400).json({ error: 'Ligging-breedtegraad moet tussen -90 en 90 wees' });
    }
    stel('location_lat', v);
  }

  if (locationLng !== undefined) {
    const v = locationLng === null ? null : Number(locationLng);
    if (v !== null && (!Number.isFinite(v) || v < -180 || v > 180)) {
      return res.status(400).json({ error: 'Ligging-lengtegraad moet tussen -180 en 180 wees' });
    }
    stel('location_lng', v);
  }

  if (dateOfBirth !== undefined) {
    if (dateOfBirth === null || dateOfBirth === '') {
      stel('date_of_birth', null);
      stel('age', null);
    } else {
      const ouderdom = berekenOuderdom(dateOfBirth);
      if (ouderdom === null || ouderdom < 0 || ouderdom > 130) {
        return res.status(400).json({ error: 'Geboortedatum lyk nie reg nie' });
      }
      stel('date_of_birth', dateOfBirth);
      stel('age', ouderdom);
    }
  }

  if (stukke.length === 0) {
    return res.status(400).json({ error: 'Geen velde om by te werk nie' });
  }

  waardes.push(req.gebruiker.id);

  try {
    const result = await pool.query(
      `update public.users
          set ${stukke.join(', ')}, updated_at = now()
        where id = $${waardes.length}
        returning id, email, first_name, last_name, contact_number,
                  date_of_birth, age, gender,
                  location_lat, location_lng, location_text,
                  location_accuracy, location_updated_at,
                  profile_photo, updated_at`,
      waardes
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kon nie die profiel bywerk nie' });
  }
});

// ---------------------------------------------------------------
// POST /api/profiel/wagwoord - verander die wagwoord
// ---------------------------------------------------------------
router.post('/wagwoord', async (req, res) => {
  const { huidigeWagwoord, nuweWagwoord, tekenAlleToestelleUit } = req.body ?? {};

  try {
    if (!huidigeWagwoord || !nuweWagwoord) {
      return res.status(400).json({
        error: 'Huidige en nuwe wagwoord is albei verpligtend',
      });
    }

    const result = await pool.query(
      'select password_hash, auth_provider from public.users where id = $1',
      [req.gebruiker.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Gebruiker bestaan nie meer nie' });
    }

    const gebruiker = result.rows[0];

    // 'n Sosiale rekening het geen wagwoord by ons nie. Om een te stel
    // is 'n ander vloei (wagwoord opstel), nie hierdie een nie.
    if (gebruiker.auth_provider !== 'local') {
      return res.status(400).json({
        error: `Hierdie rekening gebruik ${gebruiker.auth_provider}-aanmelding. Daar is geen wagwoord om te verander nie.`,
      });
    }

    const reg = await vergelykWagwoord(huidigeWagwoord, gebruiker.password_hash);
    if (!reg) {
      return res.status(401).json({ error: 'Die huidige wagwoord is verkeerd' });
    }

    if (huidigeWagwoord === nuweWagwoord) {
      return res.status(400).json({ error: 'Die nuwe wagwoord is dieselfde as die ou een' });
    }

    const sterkteFoute = wagwoordSterkteFoute(nuweWagwoord);
    if (sterkteFoute.length) {
      return res.status(400).json({
        error: 'Die nuwe wagwoord is nie sterk genoeg nie',
        details: sterkteFoute,
      });
    }

    const hash = await hashWagwoord(nuweWagwoord);
    await pool.query(
      'update public.users set password_hash = $1, updated_at = now() where id = $2',
      [hash, req.gebruiker.id]
    );

    // Alle sessies doodmaak is die veilige standaard, want 'n
    // gesteelde koekie bly andersins werk nadat die wagwoord verander is.
    const allesUit = tekenAlleToestelleUit !== false;
    let sessiesVerwyder = 0;

    if (allesUit) {
      const telling = await pool.query(
        'select count(*)::int as n from public.sessions where user_id = $1',
        [req.gebruiker.id]
      );
      sessiesVerwyder = telling.rows[0].n;
      await verwyderAlleSessies(req.gebruiker.id);
      res.clearCookie(KOEKIE_NAAM, { path: '/' });
    } else {
      // Los hierdie sessie, maar verwyder die ander
      const telling = await pool.query(
        'select count(*)::int as n from public.sessions where user_id = $1 and id <> $2',
        [req.gebruiker.id, req.sessie.sessieId]
      );
      sessiesVerwyder = telling.rows[0].n;
      await pool.query(
        'delete from public.sessions where user_id = $1 and id <> $2',
        [req.gebruiker.id, req.sessie.sessieId]
      );
    }

    res.json({
      ok: true,
      sessiesVerwyder,
      ingetekenGebly: !allesUit,
      boodskap: allesUit
        ? 'Wagwoord verander. Teken weer in op alle toestelle.'
        : 'Wagwoord verander. Ander toestelle is uitgeteken.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kon nie die wagwoord verander nie' });
  }
});

module.exports = router;
