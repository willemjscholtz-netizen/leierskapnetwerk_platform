require('dotenv').config();

const pool = require('./src/db/pool');
const { skepSessie, KOEKIE_NAAM } = require('./src/auth/session');

const BASIS = process.env.PUBLIC_URL ?? 'http://localhost:3000';
const EPOS = process.argv[2];

let koekie = '';

async function roep(metode, pad, liggaam) {
  const opsies = {
    method: metode,
    headers: { 'Content-Type': 'application/json' },
  };
  if (koekie) opsies.headers.Cookie = koekie;
  if (liggaam) opsies.body = JSON.stringify(liggaam);

  const res = await fetch(`${BASIS}${pad}`, opsies);
  const stel = res.headers.getSetCookie?.() ?? [];
  if (stel.length) koekie = stel[0].split(';')[0];

  let data;
  try { data = await res.json(); } catch { data = { raw: '(nie JSON nie)' }; }
  return { status: res.status, data };
}

function wys(titel, r) {
  console.log(`\n--- ${titel} ---`);
  console.log('Status:', r.status);
  console.log(JSON.stringify(r.data, null, 2));
}

(async () => {
  console.log('Basis:', BASIS);

  // Kry die gebruiker uit die databasis
  const u = await pool.query(
    'select id, email, email_verified, auth_provider from public.users where email = $1',
    [EPOS.toLowerCase()]
  );

  if (u.rows.length === 0) {
    console.log('Geen rekening met daardie e-posadres nie.');
    process.exit(1);
  }

  const gebruiker = u.rows[0];
  console.log('Gebruiker:', gebruiker.id, gebruiker.email,
              '| bevestig:', gebruiker.email_verified,
              '| provider:', gebruiker.auth_provider);

  // Skep 'n sessie direk in die databasis (captcha oorgeslaan)
  const sessie = await skepSessie(gebruiker.id, true, {
    get: () => 'toets-skrip',
    ip: '127.0.0.1',
  });
  koekie = `${KOEKIE_NAAM}=${sessie.token}`;
  console.log('Sessie geskep, verval:', sessie.expiresAt.toISOString());

  // 1. Lees die profiel
  wys('1. Lees profiel', await roep('GET', '/api/profiel'));

  // 2. Werk 'n paar velde by
  wys('2. Werk kontak, geslag en ligging by', await roep('PATCH', '/api/profiel', {
    contactNumber: '0821234567',
    gender: 'Manlik',
    locationText: 'Bloemfontein, Vrystaat',
  }));

  // 3. 'n Leë naam moet geweier word
  wys('3. Leë naam', await roep('PATCH', '/api/profiel', { firstName: '   ' }));

  // 4. Onsinnige breedtegraad
  wys('4. Breedtegraad 999', await roep('PATCH', '/api/profiel', { locationLat: 999 }));

  // 5. Geldige ligging
  wys('5. Geldige ligging', await roep('PATCH', '/api/profiel', {
    locationLat: -29.0852, locationLng: 26.1596,
  }));

  // 6. Verkeerde huidige wagwoord
  wys('6. Verkeerde ou wagwoord', await roep('POST', '/api/profiel/wagwoord', {
    huidigeWagwoord: 'Verkeerd123!',
    nuweWagwoord: 'NogSterker456!',
  }));

  // 7. Swak nuwe wagwoord
  wys('7. Swak nuwe wagwoord', await roep('POST', '/api/profiel/wagwoord', {
    huidigeWagwoord: 'SterkWagwoord123!',
    nuweWagwoord: 'kort',
  }));

  // 8. Dieselfde as die ou een
  wys('8. Nuwe = ou wagwoord', await roep('POST', '/api/profiel/wagwoord', {
    huidigeWagwoord: 'SterkWagwoord123!',
    nuweWagwoord: 'SterkWagwoord123!',
  }));

  // 9. Werklike verandering, hierdie sessie bly
  wys('9. Verander wagwoord (bly ingeteken)', await roep('POST', '/api/profiel/wagwoord', {
    huidigeWagwoord: 'SterkWagwoord123!',
    nuweWagwoord: 'NogSterker456!',
    tekenAlleToestelleUit: false,
  }));

  // 10. Werk hierdie sessie nog?
  wys('10. Sessie werk nog', await roep('GET', '/api/profiel'));

  console.log('\n=== Klaar ===');
  console.log('Die wagwoord is nou: NogSterker456!');
  console.log('Om terug te sit:');
  console.log(`  bash toets-profiel-2.sh ${EPOS}   (met die wagwoord in die skrip verander)`);
  await pool.end();
  process.exit(0);
})();
