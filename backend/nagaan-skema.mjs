// nagaan-skema.mjs
//
// Kyk of die drie tabelle reg geskep is, en of hulle leeg is.
//
// Gebruik:
//   PGPASSWORD='jou-wagwoord' node nagaan-skema.mjs

import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.PGHOST ?? 'aws-1-eu-west-1.pooler.supabase.com',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'postgres',
  user: process.env.PGUSER ?? 'postgres.fbtxfuhwxgntpywcapru',
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false },
});

const tabelle = [
  'Belangstellingsveld',
  'Belangstellings',
  'Gebruiker_Belangstellings',
];

try {
  for (const t of tabelle) {
    const bestaan = await pool.query(
      `select count(*)::int as n
         from information_schema.tables
        where table_schema = 'public' and table_name = $1`,
      [t]
    );

    if (bestaan.rows[0].n === 0) {
      console.log(`ONTBREEK: public."${t}"`);
      continue;
    }

    const kolomme = await pool.query(
      `select column_name, data_type, is_nullable
         from information_schema.columns
        where table_schema = 'public' and table_name = $1
        order by ordinal_position`,
      [t]
    );

    const rye = await pool.query(`select count(*)::int as n from public."${t}"`);

    console.log(`\nOK: public."${t}"  (${rye.rows[0].n} rye)`);
    for (const k of kolomme.rows) {
      const leeg = k.is_nullable === 'NO' ? 'verpligtend' : 'opsioneel';
      console.log(`   ${k.column_name.padEnd(26)} ${k.data_type.padEnd(28)} ${leeg}`);
    }
  }

  // Die vreemde sleutels - hier sien 'n mens of die verwysings reg is
  const vk = await pool.query(
    `select tc.constraint_name, tc.table_name, kcu.column_name,
            ccu.table_name as verwys_na, ccu.column_name as verwys_kolom
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu
         on kcu.constraint_name = tc.constraint_name
       join information_schema.constraint_column_usage ccu
         on ccu.constraint_name = tc.constraint_name
      where tc.constraint_type = 'FOREIGN KEY'
        and tc.table_schema = 'public'
        and tc.table_name in ('Belangstellings', 'Gebruiker_Belangstellings')
      order by tc.table_name, tc.constraint_name`
  );

  console.log('\nVREEMDE SLEUTELS:');
  if (vk.rows.length === 0) {
    console.log('   (geen)');
  } else {
    for (const r of vk.rows) {
      console.log(`   ${r.table_name}.${r.column_name} -> ${r.verwys_na}.${r.verwys_kolom}`);
    }
  }
} catch (fout) {
  console.error('\nFOUT:', fout.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
