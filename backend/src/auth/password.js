const bcrypt = require('bcrypt');

// Hoe streng die reël is - 12 karakters met hoof-, klein-, syfer- en
// spesiale karakter. Slegs vir plaaslike rekeninge; sosiale aanmeldings
// het geen wagwoord by ons nie.
const WAGWOORD_MIN_LENGTE = 12;

function wagwoordSterkteFoute(wagwoord) {
  const foute = [];

  if (typeof wagwoord !== 'string' || wagwoord.length < WAGWOORD_MIN_LENGTE) {
    foute.push(`Wagwoord moet minstens ${WAGWOORD_MIN_LENGTE} karakters wees`);
    return foute; // Die res is nie sinvol as dit te kort is nie
  }

  if (!/[A-Z]/.test(wagwoord)) foute.push('Wagwoord moet \u0027n hoofletter hê');
  if (!/[a-z]/.test(wagwoord)) foute.push('Wagwoord moet \u0027n kleinletter hê');
  if (!/[0-9]/.test(wagwoord)) foute.push('Wagwoord moet \u0027n syfer hê');
  if (!/[^A-Za-z0-9]/.test(wagwoord)) foute.push('Wagwoord moet \u0027n spesiale karakter hê');

  // Twee algemene slaggate wat 'n mens nie verwag nie
  if (/^\s|\s$/.test(wagwoord)) foute.push('Wagwoord mag nie met spasie begin of eindig nie');
  if (/\s{2,}/.test(wagwoord)) foute.push('Wagwoord mag nie opeenvolgende spasies hê nie');

  return foute;
}

async function hashWagwoord(wagwoord) {
  // 12 rondtes is die huidige aanbeveling - stadig genoeg om aanvalle
  // duur te maak, vinnig genoeg vir 'n webversoek.
  return bcrypt.hash(wagwoord, 12);
}

async function vergelykWagwoord(wagwoord, hash) {
  if (!hash) return false; // Sosiale rekening het geen wagwoord nie
  return bcrypt.compare(wagwoord, hash);
}

module.exports = {
  WAGWOORD_MIN_LENGTE,
  wagwoordSterkteFoute,
  hashWagwoord,
  vergelykWagwoord,
};
