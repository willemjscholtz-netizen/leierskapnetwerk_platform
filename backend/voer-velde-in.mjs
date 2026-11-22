import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const DATA_LÊER = resolve(HIER, 'velde.json');

let VELDE;
try {
  VELDE = JSON.parse(readFileSync(DATA_LÊER, 'utf8'));
} catch (fout) {
  console.error(`Kon nie ${DATA_LÊER} lees nie: ${fout.message}`);
  process.exit(1);
}

if (!Array.isArray(VELDE) || VELDE.length === 0) {
  console.error("velde.json moet 'n nie-lege lys wees.");
  process.exit(1);
}

function slug(s) {
  return String(s)
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

  let veldeVerwerk = 0;
  let opsiesVerwerk = 0;
  const alleVeldKodes = new Set();
  const alleOpsieKodes = new Set();

  const bestaande = await kliënt.query(
    `select coalesce(max(volgorde), 0)::int as maks from public."Belangstellingsveld"`
  );
  let veldVolgorde = bestaande.rows[0].maks;

  for (const v of VELDE) {
    if (!v?.veld || !Array.isArray(v.opsies)) {
      throw new Error(`Veld sonder naam of opsies: ${JSON.stringify(v).slice(0, 80)}`);
    }

    const veldKode = slug(v.veld);
    if (alleVeldKodes.has(veldKode)) {
      throw new Error(`Twee velde met dieselfde kode: ${veldKode}`);
    }
    alleVeldKodes.add(veldKode);
    veldVolgorde++;

    const veldRy = await kliënt.query(
      `insert into public."Belangstellingsveld" (kode, naam, volgorde)
       values ($1, $2, $3)
       on conflict (kode) do update
         set naam = excluded.naam,
             datum_gewysig = now()
       returning id`,
      [veldKode, v.veld, veldVolgorde]
    );
    const veldId = veldRy.rows[0].id;
    veldeVerwerk++;
    console.log(`\nVeld: ${v.veld}  (${v.opsies.length} opsies)`);

    for (let oi = 0; oi < v.opsies.length; oi++) {
      const opsie = String(v.opsies[oi]).trim();
      if (!opsie) continue;

      const opsieKode = `${veldKode}__${slug(opsie)}`;
      if (alleOpsieKodes.has(opsieKode)) {
        throw new Error(`Twee opsies met dieselfde kode: ${opsieKode}`);
      }
      alleOpsieKodes.add(opsieKode);

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
      opsiesVerwerk++;
      console.log(`   ${String(oi + 1).padStart(2)}. ${opsie}`);
    }
  }

  await kliënt.query('commit');
  console.log(`\nKlaar: ${veldeVerwerk} velde, ${opsiesVerwerk} opsies verwerk.`);

  const telling = await kliënt.query(
    `select
       (select count(*)::int from public."Belangstellingsveld")       as velde,
       (select count(*)::int from public."Belangstellings")           as belangstellings,
       (select count(*)::int from public."Gebruiker_Belangstellings") as keuses`
  );
  console.log('In die databasis:', telling.rows[0]);

  const perVeld = await kliënt.query(
    `select v.volgorde, v.naam, count(b.id)::int as aantal
       from public."Belangstellingsveld" v
       left join public."Belangstellings" b on b.belangstellingsveld_id = v.id
      group by v.id, v.naam, v.volgorde
      order by v.volgorde`
  );
  console.log('\nPer veld:');
  for (const r of perVeld.rows) {
    console.log(`   ${String(r.volgorde).padStart(2)}. ${String(r.aantal).padStart(3)}  ${r.naam}`);
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
