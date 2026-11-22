// ===============================================================
// FOONNOMMERS - stoor skoon, vertoon in een vaste formaat
// ===============================================================
//
// Die vertoon-formaat is: 000 000 0000
//
//   "0828239446"    -> "082 823 9446"
//   "082 123 4567"  -> "082 123 4567"
//   "+27828239446"  -> "+27 828 239 446"
//   "082823944"     -> "082 823 944"   (korter nommer)
//
// EEN PLEK: die formaat staan net hier. Verander hierdie lêer en
// die hele platform vertoon anders - die data in die databasis
// bly onveranderd, want ons stoor altyd skoon syfers.

/**
 * Maak 'n foonnommer skoon vir stoor: net syfers, en 'n '+'
 * as daar een vooraan was.
 */
export function maakFoonSkoon(waarde) {
  if (waarde === null || waarde === undefined) return null;

  const teks = String(waarde).trim();
  if (!teks) return null;

  const hetPl = teks.startsWith('+');
  const syfers = teks.replace(/\D/g, '');

  if (!syfers) return null;
  return hetPl ? `+${syfers}` : syfers;
}

/**
 * Vertoon 'n foonnommer.
 *
 * Suid-Afrikaanse nommers van 10 syfers word as 000 000 0000
 * gegroepeer. Ander lengtes word in groepe van drie gesit, met
 * die oorblywende syfers in die laaste groep.
 */
export function vertoonFoon(waarde) {
  const skoon = maakFoonSkoon(waarde);
  if (!skoon) return null;

  if (skoon.startsWith('+')) {
    const syfers = skoon.slice(1);
    const land = syfers.slice(0, 2);
    const res = syfers.slice(2);
    return `+${land} ${groepeer(res)}`.trim();
  }

  // Suid-Afrikaans: 0XX XXX XXXX
  if (skoon.length === 10) {
    return `${skoon.slice(0, 3)} ${skoon.slice(3, 6)} ${skoon.slice(6)}`;
  }

  return groepeer(skoon);
}

/**
 * Groepeer syfers in drieë.
 *
 * 'n Kort oorskot word by die VORIGE groep gegooi, nie as 'n
 * alleenlopende een gelos nie - so word "8282394" (7 syfers)
 * "828 2394" eerder as "828 239 4".
 */
function groepeer(syfers) {
  if (!syfers) return '';

  const oorskot = syfers.length % 3;
  const stukke = [];

  let i = 0;
  if (oorskot === 1 && syfers.length > 3) {
    // Die eerste groep kry 4 syfers, dan volg groepe van 3
    stukke.push(syfers.slice(0, 4));
    i = 4;
  } else if (oorskot === 2 && syfers.length > 3) {
    stukke.push(syfers.slice(0, 3));
    i = 3;
  }

  for (; i < syfers.length; i += 3) {
    stukke.push(syfers.slice(i, i + 3));
  }

  return stukke.join(' ');
}
