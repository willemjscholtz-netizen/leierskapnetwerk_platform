require('dotenv').config();

const BASIS = process.env.PUBLIC_URL ?? 'http://localhost:3000';
const EPOS = process.argv[2];
const WAGWOORD = process.argv[3] ?? 'SterkWagwoord123!';

if (!EPOS) {
  console.log('Gebruik: node toets-profiel.js jou@eposadres.co.za [wagwoord]');
  process.exit(1);
}

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

  // Teken in om 'n koekie te kry
  const inskryf = await roep('POST', '/api/auth/teken-in', {
    email: EPOS, password: WAGWOORD, rememberMe: true,
    recaptchaToken: 'x',
  });
  console.log('\nInteken:', inskryf.status, inskryf.data.error ?? 'ok');
  if (inskryf.status !== 200) {
    console.log('\nKon nie inteken nie. Gaan voort is onmoontlik.');
    process.exit(1);
  }
  console.log('Koekie:', koekie ? 'ontvang' : 'GEEN');

  // 1. Lees die profiel
  wys('1. Lees profiel', await roep('GET', '/api/profiel'));

  // 2. Werk 'n paar velde by
  wys('2. Werk kontak en geslag by', await roep('PATCH', '/api/profiel', {
    contactNumber: '0821234567',
    gender: 'Manlik',
    locationText: 'Bloemfontein, Vrystaat',
  }));

  // 3. 'n Leë naam moet geweier word
  wys('3. Leë naam', await roep('PATCH', '/api/profiel', { firstName: '   ' }));

  // 4. Onsinnige breedtegraad
  wys('4. Slegte ligging', await roep('PATCH', '/api/profiel', { locationLat: 999 }));

  // 5. Verkeerde huidige wagwoord
  wys('5. Verkeerde ou wagwoord', await roep('POST', '/api/profiel/wagwoord', {
    huidigeWagwoord: 'Verkeerd123!',
    nuweWagwoord: 'NogSterker456!',
  }));

  // 6. Swak nuwe wagwoord
  wys('6. Swak nuwe wagwoord', await roep('POST', '/api/profiel/wagwoord', {
    huidigeWagwoord: WAGWOORD,
    nuweWagwoord: 'kort',
  }));

  // 7. Werklike verandering, maar hou hierdie sessie
  wys('7. Verander wagwoord (bly ingeteken)', await roep('POST', '/api/profiel/wagwoord', {
    huidigeWagwoord: WAGWOORD,
    nuweWagwoord: 'NogSterker456!',
    tekenAlleToestelleUit: false,
  }));

  // 8. Werk die ou wagwoord nog?
  wys('8. Ou wagwoord werk nie meer', await roep('POST', '/api/auth/teken-in', {
    email: EPOS, password: WAGWOORD, recaptchaToken: 'x',
  }));

  // 9. Die nuwe een werk
  wys('9. Nuwe wagwoord werk', await roep('POST', '/api/auth/teken-in', {
    email: EPOS, password: 'NogSterker456!', recaptchaToken: 'x',
  }));

  console.log('\n=== Klaar ===');
  console.log('Die wagwoord is nou: NogSterker456!');
  console.log('Om terug te sit, hardloop:');
  console.log(`  node toets-profiel.js ${EPOS} NogSterker456!`);
  process.exit(0);
})();
