// Kleintoets vir die wagwoord-hulplêer
const {
  wagwoordSterkteFoute,
  hashWagwoord,
  vergelykWagwoord,
} = require('./src/auth/password');

const GELDIG = 'SterkWagwoord123!';

const SWAK = [
  ['kort123!',            'te kort'],
  ['geenhoofletter123!',  'geen hoofletter'],
  ['GEENKLEINLETTER123!', 'geen kleinletter'],
  ['GeenSyferHierNie!',   'geen syfer'],
  ['GeenSpesiaalHier123', 'geen spesiale karakter'],
  [' SpasieVooraan123!',  'spasie vooraan'],
];

(async () => {
  console.log('--- Sterkte-reels ---');
  console.log('Geldig:', wagwoordSterkteFoute(GELDIG).length === 0 ? 'aanvaar' : 'AFGEKEUR');

  for (const [wagwoord, beskrywing] of SWAK) {
    const foute = wagwoordSterkteFoute(wagwoord);
    const status = foute.length > 0 ? 'afgekeur' : 'AANVAAR (fout!)';
    console.log(`${beskrywing.padEnd(24)} -> ${status}`);
  }

  console.log('\n--- Hash en vergelyking ---');
  const t0 = Date.now();
  const hash = await hashWagwoord(GELDIG);
  console.log('Hash:', hash.slice(0, 29) + '...');
  console.log('Tyd:', Date.now() - t0, 'ms');

  console.log('Regte wagwoord:', await vergelykWagwoord(GELDIG, hash));
  console.log('Verkeerde wagwoord:', await vergelykWagwoord('Verkeerd123!', hash));
  console.log('Sosiale rekening (geen hash):', await vergelykWagwoord(GELDIG, null));

  // Twee keer dieselfde wagwoord moet twee verskillende hashes gee
  const hash2 = await hashWagwoord(GELDIG);
  console.log('Twee hashes dieselfde?', hash === hash2);
})();
