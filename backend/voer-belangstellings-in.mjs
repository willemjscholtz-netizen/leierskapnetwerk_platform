// voer-belangstellings-in.mjs
//
// Voer die velde en hul belangstellings in die databasis in.
//
// Die data is in hierdie lêer ingebou, so die skrip het niks anders
// nodig nie. Dit is veilig om meer as een keer te hardloop:
// 'on conflict (kode) do update' werk die naam en volgorde by
// sonder om duplikate te skep.
//
// Gebruik:
//   PGPASSWORD='jou-wagwoord' node voer-belangstellings-in.mjs
//
// Die wagwoord bly in die omgewing, nie in 'n lêer nie.

import pg from 'pg';

const VELDE = [
  {
    naam: 'Maatskaplike sorg en welsyn',
    opsies: [
      'armoedeverligting en noodleniging',
      'ondersteuning van behoeftige gesinne',
      'hulp aan hawelose persone',
      'versorging en ondersteuning van weeskinders',
      'ondersteuning van pleeggesinne',
      'hulp aan slagoffers van gesinsgeweld',
      'ondersteuning van enkelouergesinne',
      'maatskaplike ondersteuning van werklose persone',
      'hulp aan mense wat deur persoonlike krisisse geraak word',
      'herintegrasie van mense wat maatskaplik uitgesluit is',
    ],
  },
];

// --- Kodes: mens-leesbare slugs ---------------------------------
function slug(s) {
  return s
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new pg.Pool({
      host: process.env.PGHOST ?? 'aws-1-eu-west-1.pooler.supabase.com',
      port: Number(process.env.PGPORT ?? 5432),
      database: process.env.PGDATABASE ?? 'postgres',
      user: process.env.PGUSER ?? 'postgres.fbtxfuhwxgntpywcapru',
      password: process.env.PGPASSWORD,
      ssl: { rejectUnauthorized: false },
    });

const kliënt = await pool.connect();

try {
  await kliënt.query('begin');

  let veldeIngesit = 0;
  let opsiesIngesit = 0;

  for (let vi = 0; vi < VELDE.length; vi++) {
    const v = VELDE[vi];
    const veldKode = slug(v.naam);

    // 1. Die veld
    const veldRy = await kliënt.query(
      `insert into public."Belangstellingsveld" (kode, naam, volgorde)
       values ($1, $2, $3)
       on conflict (kode) do update
         set naam = excluded.naam,
             volgorde = excluded.volgorde,
             datum_gewysig = now()
       returning id`,
      [veldKode, v.naam, vi + 1]
    );
    const veldId = veldRy.rows[0].id;
    veldeIngesit++;
    console.log(`Veld: ${v.naam}`);

    // 2. Die opsies onder daardie veld
    for (let oi = 0; oi < v.opsies.length; oi++) {
      const opsie = v.opsies[oi];
      const opsieKode = `${veldKode}__${slug(opsie)}`;

      await kliënt.query(
        `insert into public."Belangstellings"
           (belangstellingsveld_id, kode, naam, volgorde)
         values ($1, $2, $3, $4)
         on conflict (kode) do update
           set naam = excluded.naam,
               volgorde = excluded.volgorde,
               belangstellingsveld_id = excluded.belangstellingsveld_id,
               datum_gewysig = now()`,
        [veldId, opsieKode, opsie, oi + 1]
      );
      opsiesIngesit++;
      console.log(`   ${String(oi + 1).padStart(2)}. ${opsie}`);
    }
  }

  await kliënt.query('commit');

  console.log(`\nKlaar: ${veldeIngesit} velde, ${opsiesIngesit} belangstellings.`);

  // --- Nagaan uit die databasis self ----------------------------
  const telling = await kliënt.query(
    `select
       (select count(*)::int from public."Belangstellingsveld")       as velde,
       (select count(*)::int from public."Belangstellings")           as belangstellings,
       (select count(*)::int from public."Gebruiker_Belangstellings") as keuses`
  );
  console.log('In die databasis:', telling.rows[0]);

  const perVeld = await kliënt.query(
    `select v.naam, count(b.id)::int as aantal
       from public."Belangstellingsveld" v
       left join public."Belangstellings" b on b.belangstellingsveld_id = v.id
      group by v.id, v.naam, v.volgorde
      order by v.volgorde`
  );
  console.log('\nPer veld:');
  for (const r of perVeld.rows) {
    console.log(`   ${String(r.aantal).padStart(3)}  ${r.naam}`);
  }
} catch (fout) {
  await kliënt.query('rollback');
  console.error('\nFOUT - niks is gestoor nie:', fout.message);
  if (fout.code) console.error('Kode:', fout.code);
  if (fout.detail) console.error('Detail:', fout.detail);
  process.exitCode = 1;
} finally {
  kliënt.release();
  await pool.end();
}
