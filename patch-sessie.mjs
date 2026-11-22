// patch-sessie.mjs
//
// Voeg profile_photo by die sessie se gebruikersobjek.
//
// Hoekom: die kopbalk se gebruikersikoon wil die profielprent wys,
// maar /api/auth/ek stuur req.gebruiker terug - en daardie objek kom
// uit vindSessie() in session.js, waar die select nie profile_photo
// insluit nie. Sonder hierdie twee reels bereik die prent nooit die
// frontend nie, en die ikoon bly voorletters wys.
//
// Gebruik:
//   node patch-sessie.mjs src/auth/session.js
// of sonder argument, as jy in backend/ staan:
//   node patch-sessie.mjs
//
// Die script skryf NIKS as een van die twee teikens nie gevind word
// nie, of as een meer as een keer voorkom. 'n Halwe wysiging (net die
// SQL, nie die objek nie) is erger as geen wysiging, en stilweg.

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LÊER = resolve(process.argv[2] ?? 'src/auth/session.js');

let bron;
try {
  bron = readFileSync(LÊER, 'utf8');
} catch (fout) {
  console.error(`Kon nie ${LÊER} lees nie: ${fout.message}`);
  process.exit(1);
}

// Rugsteun een keer, voor enige verandering.
const rugsteun = `${LÊER}.bak`;
try {
  readFileSync(rugsteun);
  console.log(`Rugsteun bestaan al: ${rugsteun} (nie oorskryf nie)`);
} catch {
  copyFileSync(LÊER, rugsteun);
  console.log(`Rugsteun gemaak: ${rugsteun}`);
}

const wysigings = [
  {
    naam: 'SELECT - voeg profile_photo by',
    van: 'u.email_verified\n       from sessions s',
    na: 'u.email_verified, u.profile_photo\n       from sessions s',
  },
  {
    naam: 'Teruggee-objek - voeg profile_photo by',
    van: '      email_verified: ry.email_verified,\n',
    na: '      email_verified: ry.email_verified,\n      profile_photo: ry.profile_photo,\n',
  },
];

let allesReg = true;

for (const w of wysigings) {
  const aantal = bron.split(w.van).length - 1;

  if (aantal === 0) {
    console.error(`OORSLAAN: "${w.na}" - die teiken-teks is nie gevind nie.`);
    allesReg = false;
    continue;
  }
  if (aantal > 1) {
    console.error(`OORSLAAN: "${w.na}" - die teiken kom ${aantal} keer voor, nie 1 nie.`);
    allesReg = false;
    continue;
  }

  bron = bron.replace(w.van, w.na);
  console.log(`Reg: "${w.na}"`);
}

if (!allesReg) {
  console.error('\nEen of meer wysigings kon nie aangebring word nie.');
  console.error('Die lêer is NIE geskryf nie - hy is soos hy was.');
  process.exit(1);
}

writeFileSync(LÊER, bron, 'utf8');
console.log(`\nGeskyf: ${LÊER}`);
console.log('\nVerifieer met:');
console.log('  grep -n "profile_photo" src/auth/session.js');
console.log('  node --check src/auth/session.js');
console.log('\nJy wil TWEE treffers sien - een in die SQL, een in die objek.');
