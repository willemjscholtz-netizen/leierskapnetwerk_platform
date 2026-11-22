// patch-ikoon.mjs
//
// Laat die gebruikersikoon regs in die kopbalk die profielprent wys
// in plaas van net voorletters. As daar geen prent is nie, bly die
// voorletters staan.
//
// Hoekom: die koppie se ikoon teken op die oomblik altyd 'n sirkel
// met die mens se voorletters, selfs wanneer profile_photo bestaan.
// Die foto is reeds in die databasis en kom deur /api/auth/ek
// (nadat patch-sessie.mjs profile_photo by die sessie gevoeg het);
// hierdie wysiging is die deel wat dit werklik op die skerm sit.
//
// Twee leers word aangepas:
//   src/components/GebruikersIkoon.jsx
//   src/components/GebruikersIkoon.css
//
// Die script skryf NIKS aan 'n leer as een van sy teikens nie gevind
// word nie, of as 'n teiken meer as een keer voorkom. 'n Halwe
// wysiging is erger as geen wysiging, en stilweg.
//
// Gebruik (vanuit die frontend/ gids):
//   node patch-ikoon.mjs
// of met 'n ander wortel:
//   node patch-ikoon.mjs /pad/na/frontend

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const WORTEL = resolve(process.argv[2] ?? '.');

const wysigings = [
  {
    leer: join(WORTEL, 'src/components/GebruikersIkoon.jsx'),
    naam: 'JSX - teken die prent as daar een is, anders die voorletters',
    van:
      '        <span className="ikoon__voorletters" aria-hidden="true">{voorletters}</span>\n',
    na:
      '        {gebruiker?.profile_photo ? (\n' +
      '          <img\n' +
      '            src={gebruiker.profile_photo}\n' +
      '            alt=""\n' +
      '            className="ikoon__prent"\n' +
      '          />\n' +
      '        ) : (\n' +
      '          <span className="ikoon__voorletters" aria-hidden="true">{voorletters}</span>\n' +
      '        )}\n',
  },
  {
    leer: join(WORTEL, 'src/components/GebruikersIkoon.css'),
    naam: 'CSS - die prent vul die ronde knoppie',
    van: '.ikoon__voorletters {\n  line-height: 1;\n}\n',
    na:
      '.ikoon__voorletters {\n  line-height: 1;\n}\n' +
      '\n' +
      '/* Die profielprent in die ikoon. Die knoppie is rond, die\n' +
      '   prent is reghoekig - sonder border-radius steek die hoeke\n' +
      '   uit. */\n' +
      '.ikoon__prent {\n' +
      '  width: 100%;\n' +
      '  height: 100%;\n' +
      '  object-fit: cover;\n' +
      '  border-radius: var(--radius-vol);\n' +
      '  display: block;\n' +
      '}\n',
  },
];

let allesReg = true;

for (const w of wysigings) {
  let bron;
  try {
    bron = readFileSync(w.leer, 'utf8');
  } catch (fout) {
    console.error(`KON NIE LEES: ${w.leer}\n  ${fout.message}`);
    allesReg = false;
    continue;
  }

  // Rugsteun een keer, voor enige verandering.
  const rugsteun = `${w.leer}.bak`;
  try {
    readFileSync(rugsteun);
    console.log(`Rugsteun bestaan al: ${rugsteun}`);
  } catch {
    copyFileSync(w.leer, rugsteun);
    console.log(`Rugsteun gemaak: ${rugsteun}`);
  }

  const aantal = bron.split(w.van).length - 1;

  if (aantal === 0) {
    console.error(`OORSLAAN: "${w.na}" in ${w.leer} - teiken nie gevind nie.`);
    allesReg = false;
    continue;
  }
  if (aantal > 1) {
    console.error(`OORSLAAN: "${w.na}" in ${w.leer} - teiken kom ${aantal} keer voor.`);
    allesReg = false;
    continue;
  }

  try {
    writeFileSync(w.leer, bron.replace(w.van, w.na), 'utf8');
  } catch (fout) {
    console.error(`KON NIE SKRYF: ${w.leer}\n  ${fout.message}`);
    allesReg = false;
    continue;
  }

  console.log(`Reg: "${w.na}"`);
}

if (!allesReg) {
  console.error('\nEen of meer wysigings het gefaal.');
  console.error('Enige leer wat "Reg" gese het, is klaar geskryf - die res is onaangeraak.');
  process.exit(1);
}

console.log('\nKlaar. Herlaai die bladsy in die blaaier.');
console.log('\nVerifieer met:');
console.log('  grep -n "ikoon__prent" src/components/GebruikersIkoon.jsx src/components/GebruikersIkoon.css');
