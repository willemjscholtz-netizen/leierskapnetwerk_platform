require('dotenv').config();

const BASIS = process.env.PUBLIC_URL ?? 'http://localhost:3000';
const EPOS = process.argv[2];

if (!EPOS) {
  console.log('Gebruik: node toets-inteken.js jou@eposadres.co.za');
  process.exit(1);
}

async function post(pad, liggaam) {
  const res = await fetch(`${BASIS}${pad}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(liggaam),
  });
  let data;
  try { data = await res.json(); } catch { data = { raw: '(nie JSON nie)' }; }
  return { status: res.status, data, koekies: res.headers.getSetCookie?.() ?? [] };
}

(async () => {
  console.log('--- Inteken met onthou = true ---');
  const r = await post('/api/auth/teken-in', {
    email: EPOS,
    password: 'SterkWagwoord123!',
    rememberMe: true,
    recaptchaToken: 'x',
  });
  console.log('Status:', r.status);
  console.log('Antwoord:', JSON.stringify(r.data, null, 2));
  console.log('Koekies:', r.koekies.length ? r.koekies.map((k) => k.split(';')[0]) : '(geen)');

  if (r.koekies.length) {
    const koekie = r.koekies[0].split(';')[0];
    const oor = /Expires=([^;]+)/i.exec(r.koekies[0]);
    const dubbel = /Max-Age=(\d+)/i.exec(r.koekies[0]);
    console.log('\nVervaldatum in koekie:', oor ? oor[1] : (dubbel ? dubbel[1] + ' sekondes' : '(sessie-koekie)'));

    // --- Wie is ingeteken? -----------------------------------
    const ek = await fetch(`${BASIS}/api/auth/ek`, { headers: { Cookie: koekie } });
    console.log('\n--- /api/auth/ek met die koekie ---');
    console.log('Status:', ek.status);
    console.log(JSON.stringify(await ek.json(), null, 2));
  }

  process.exit(0);
})();
