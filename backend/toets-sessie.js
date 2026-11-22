// Kleintoets vir die token- en tydberekeninge (raak nie die databasis nie)
const crypto = require('crypto');

const UREN_SONDER_ONTHOU = 24;
const DAE_MET_ONTHOU = 30;

function nuweToken() {
  return crypto.randomBytes(32).toString('hex');
}
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
function berekenVerval(onthouMy) {
  const dae = onthouMy ? DAE_MET_ONTHOU : 0;
  const ure = onthouMy ? 0 : UREN_SONDER_ONTHOU;
  return new Date(Date.now() + (dae * 24 * 60 + ure * 60) * 60 * 1000);
}

console.log('--- Token ---');
const t1 = nuweToken();
const t2 = nuweToken();
console.log('Lengte:', t1.length, 'karakters (64 grepe in heks)');
console.log('Twee tokens dieselfde?', t1 === t2);

console.log('\n--- Hash ---');
const h1 = hashToken(t1);
console.log('Hash lengte:', h1.length, 'karakters');
console.log('Selfde token, selfde hash?', hashToken(t1) === h1);
console.log('Ander token, ander hash?', hashToken(t2) !== h1);

console.log('\n--- Vervaltye ---');
const sonder = berekenVerval(false);
const met = berekenVerval(true);
const ureTotSonder = (sonder - Date.now()) / 3600000;
const daeTotMet = (met - Date.now()) / 86400000;
console.log('Sonder onthou: ', ureTotSonder.toFixed(1), 'uur');
console.log('Met onthou:    ', daeTotMet.toFixed(1), 'dae');
console.log('Met onthou is 30 dae?', Math.abs(daeTotMet - 30) < 0.01);
