// skep-tabelle.mjs
//
// Skep die drie tabelle regstreeks in die databasis, eerder as om
// die SQL in die Supabase-redigeerder te plak. Dit vermy die
// probleme met aanhalingstekens en rylengtes wat die redigeerder
// gee.
//
// Gebruik (een reël, wagwoord in die omgewing - nie in 'n lêer nie):
//
//   PGPASSWORD='jou-wagwoord' node skep-tabelle.mjs
//
// Of met die volle verbindingsreeks:
//
//   DATABASE_URL='postgresql://...' node skep-tabelle.mjs
//
// Die skrip is veilig om meer as een keer te hardloop: alles
// gebruik IF NOT EXISTS.

import pg from 'pg';

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

const STAPPE = [
  {
    naam: 'Belangstellingsveld',
    sql: `
      create table if not exists public."Belangstellingsveld" (
        id             bigint generated always as identity not null,
        kode           text not null unique,
        naam           text not null,
        beskrywing     text,
        volgorde       integer not null default 0,
        aktief         boolean not null default true,
        datum_geskep   timestamptz not null default now(),
        datum_gewysig  timestamptz not null default now(),
        gewysig_deur   text,
        constraint belangstellingsveld_pkey primary key (id)
      )
    `,
  },
  {
    naam: 'Belangstellings',
    sql: `
      create table if not exists public."Belangstellings" (
        id                      bigint generated always as identity not null,
        belangstellingsveld_id  bigint not null,
        kode                    text not null unique,
        naam                    text not null,
        beskrywing              text,
        volgorde                integer not null default 0,
        aktief                  boolean not null default true,
        datum_geskep            timestamptz not null default now(),
        datum_gewysig           timestamptz not null default now(),
        gewysig_deur            text,
        constraint belangstellings_pkey primary key (id),
        constraint belangstellings_veld_id_fkey
          foreign key (belangstellingsveld_id)
          references public."Belangstellingsveld" (id)
          on delete cascade,
        constraint belangstellings_veld_naam_uniek
          unique (belangstellingsveld_id, naam)
      )
    `,
  },
  {
    naam: 'Belangstellings indeks',
    sql: `
      create index if not exists belangstellings_veld_volgorde_idx
        on public."Belangstellings" (belangstellingsveld_id, volgorde)
    `,
  },
  {
    naam: 'Gebruiker_Belangstellings',
    sql: `
      create table if not exists public."Gebruiker_Belangstellings" (
        id                bigint generated always as identity not null,
        gebruiker_id      bigint not null,
        belangstelling_id bigint not null,
        datum_geskep      timestamptz not null default now(),
        gewysig_deur      text,
        constraint gebruiker_belangstellings_pkey primary key (id),
        constraint gebruiker_belangstellings_gebruiker_fkey
          foreign key (gebruiker_id)
          references public.users (id)
          on delete cascade,
        constraint gebruiker_belangstellings_belangstelling_fkey
          foreign key (belangstelling_id)
          references public."Belangstellings" (id)
          on delete cascade,
        constraint gebruiker_belangstellings_uniek
          unique (gebruiker_id, belangstelling_id)
      )
    `,
  },
  {
    naam: 'Gebruiker_Belangstellings indeks (gebruiker)',
    sql: `
      create index if not exists gebruiker_belangstellings_gebruiker_idx
        on public."Gebruiker_Belangstellings" (gebruiker_id)
    `,
  },
  {
    naam: 'Gebruiker_Belangstellings indeks (belangstelling)',
    sql: `
      create index if not exists gebruiker_belangstellings_belangstelling_idx
        on public."Gebruiker_Belangstellings" (belangstelling_id)
    `,
  },
];

try {
  // Kyk eers of ons kan praat, en of public.users daar is.
  const users = await pool.query(
    `select count(*)::int as n
       from information_schema.tables
      where table_schema = 'public' and table_name = 'users'`
  );

  if (users.rows[0].n === 0) {
    console.error('STOP: public.users bestaan nie in hierdie databasis nie.');
    console.error('Die vreemde sleutel sal faal. Kyk of jy aan die regte');
    console.error('projek gekoppel is.');
    process.exit(1);
  }
  console.log('public.users gevind - ons kan begin.\n');

  for (const stap of STAPPE) {
    await pool.query(stap.sql);
    console.log(`OK: ${stap.naam}`);
  }

  console.log('\n--- Nagaan ---');
  for (const t of ['Belangstellingsveld', 'Belangstellings', 'Gebruiker_Belangstellings']) {
    const kolomme = await pool.query(
      `select count(*)::int as n
         from information_schema.columns
        where table_schema = 'public' and table_name = $1`,
      [t]
    );
    const rye = await pool.query(`select count(*)::int as n from public."${t}"`);
    console.log(`  public."${t}": ${kolomme.rows[0].n} kolomme, ${rye.rows[0].n} rye`);
  }

  const vk = await pool.query(
    `select tc.table_name, kcu.column_name,
            ccu.table_name as verwys_na
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu
         on kcu.constraint_name = tc.constraint_name
       join information_schema.constraint_column_usage ccu
         on ccu.constraint_name = tc.constraint_name
      where tc.constraint_type = 'FOREIGN KEY'
        and tc.table_schema = 'public'
        and tc.table_name in ('Belangstellings', 'Gebruiker_Belangstellings')
      order by tc.table_name`
  );

  console.log('\n  Vreemde sleutels:');
  for (const r of vk.rows) {
    console.log(`    ${r.table_name}.${r.column_name} -> ${r.verwys_na}`);
  }

  console.log('\nKlaar.');
} catch (fout) {
  console.error('\nFOUT:', fout.message);
  if (fout.code) console.error('Kode:', fout.code);
  if (fout.detail) console.error('Detail:', fout.detail);
  process.exitCode = 1;
} finally {
  await pool.end();
}
