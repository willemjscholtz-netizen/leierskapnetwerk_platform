require('dotenv').config();
const pool = require('./src/db/pool');
const HOST = '127' + '.0.0.1';
const BASIS = 'http' + '://' + HOST + ':3000';
(async () => {
  const EPOS = process.argv[2];
  const WAGWOORD = process.argv[3];
  await pool.query("update public.users set location_accuracy = null, location_updated_at = null, location_text = 'TOETS-LEEG' where email = $1", [EPOS.toLowerCase()]);
  console.log('1. Ligging skoongemaak.');
  const res = await fetch(BASIS + '/api/auth/teken-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EPOS.toLowerCase(), password: WAGWOORD, rememberMe: false, recaptchaToken: 'x', locationLat: -25.7479, locationLng: 28.2293, locationAccuracy: 35 })
  });
  console.log('2. Antwoord:', res.status);
  console.log('  ', JSON.stringify(await res.json()));
  const r = await pool.query('select location_lat, location_lng, location_text, location_accuracy, location_updated_at from public.users where email = $1', [EPOS.toLowerCase()]);
  console.log('3. Databasis:');
  console.log(JSON.stringify(r.rows[0], null, 2));
  await pool.end();
})();
