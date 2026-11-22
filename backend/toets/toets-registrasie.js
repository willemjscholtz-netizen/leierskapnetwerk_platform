require('dotenv').config();

const BASIS = process.env.PUBLIC_URL ?? 'http://localhost:3000';
const EPOS = process.argv[2];

// 'n Unieke e-pos per lopie, sodat 'n vorige toets nie bots nie
const stam = Date.now();
const EERSTE = `toets${stam}@voorbeeld.co.za`;

function wys(titel, uitslag) {
  console.log(`\n--- ${titel} ---`);
  console.log(JSON.stringify(uitslag, null, 2));
}

async function post(pad, liggaam) {
  const res = await fetch(`${BASIS}${pad}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(liggaam),
  });
  let data;
  try { data = await res.json(); } catch { data = { raw: '(nie JSON nie)' }; }
  return { status: res.status, data };
}

(async () => {
  console.log('Basis:', BASIS);
  console.log('Toets-e-pos vir bevestiging:', EPOS);

  // --- 1. Swak wagwoord moet geweier word --------------------
  wys('1. Swak wagwoord', await post('/api/auth/registreer', {
    email: EERSTE,
    password: 'kort',
    firstName: 'Toets',
    lastName: 'Gebruiker',
    recaptchaToken: 'x',
  }));

  // --- 2. Ontbrekende velde ----------------------------------
  wys('2. Ontbrekende naam', await post('/api/auth/registreer', {
    email: EERSTE,
    password: 'SterkWagwoord123!',
    recaptchaToken: 'x',
  }));

  // --- 3. Onsinnige e-posadres -------------------------------
  wys('3. Onsinnige e-pos', await post('/api/auth/registreer', {
    email: 'nie-n-pos-nie',
    password: 'SterkWagwoord123!',
    firstName: 'Toets',
    lastName: 'Gebruiker',
    recaptchaToken: 'x',
  }));

  // --- 4. Werklike registrasie -------------------------------
  console.log('\n=== 4. Werklike registrasie met', EPOS, '===');
  wys('4. Registrasie', await post('/api/auth/registreer', {
    email: EPOS,
    password: 'SterkWagwoord123!',
    firstName: 'Willem',
    lastName: 'Scholtz',
    contactNumber: '0821234567',
    dateOfBirth: '1990-05-15',
    gender: 'Manlik',
    recaptchaToken: 'x',
  }));

  // --- 5. Dieselfde e-pos weer -------------------------------
  wys('5. Dieselfde e-pos weer', await post('/api/auth/registreer', {
    email: EPOS,
    password: 'SterkWagwoord123!',
    firstName: 'Willem',
    lastName: 'Scholtz',
    recaptchaToken: 'x',
  }));

  // --- 6. Inteken voordat die e-pos bevestig is --------------
  wys('6. Inteken voor bevestiging', await post('/api/auth/teken-in', {
    email: EPOS,
    password: 'SterkWagwoord123!',
    recaptchaToken: 'x',
  }));

  console.log('\n=== Klaar ===');
  console.log('Kyk in', EPOS, 'se inkassie vir die bevestigingskakel.');
  console.log('Klik dit, en hardloop dan:');
  console.log('  node toets-inteken.js ' + EPOS);
  process.exit(0);
})();
