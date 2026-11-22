require('dotenv').config();

const pool = require('./src/db/pool');
const { hashWagwoord, wagwoordSterkteFoute } = require('./src/auth/password');

const EPOS = process.argv[2];
const NUWE = process.argv[3];

(async () => {
  const foute = wagwoordSterkteFoute(NUWE);
  if (foute.length) {
    console.log('Die nuwe wagwoord is nie sterk genoeg nie:');
    for (const f of foute) console.log('  -', f);
    await pool.end();
    process.exit(1);
  }

  const u = await pool.query(
    'select id, email, auth_provider from public.users where email = $1',
    [EPOS.toLowerCase()]
  );

  if (u.rows.length === 0) {
    console.log('Geen rekening met daardie e-posadres nie.');
    await pool.end();
    process.exit(1);
  }

  const gebruiker = u.rows[0];

  if (gebruiker.auth_provider !== 'local') {
    console.log('Hierdie rekening gebruik', gebruiker.auth_provider,
                '- dit het geen wagwoord by ons nie.');
    await pool.end();
    process.exit(1);
  }

  const hash = await hashWagwoord(NUWE);

  await pool.query(
    'update public.users set password_hash = $1, updated_at = now() where id = $2',
    [hash, gebruiker.id]
  );

  // Alle sessies doodmaak - dit is gepas wanneer 'n wagwoord
  // van buite af gestel word.
  const s = await pool.query(
    'delete from public.sessions where user_id = $1',
    [gebruiker.id]
  );

  console.log('Wagwoord gestel vir', gebruiker.email);
  console.log('Sessies verwyder:', s.rowCount);
  console.log('Die wagwoord is nou:', NUWE);

  await pool.end();
  process.exit(0);
})();
