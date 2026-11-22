import './WagwoordSterkte.css';

// Dieselfde reëls as die backend se wagwoordSterkteFoute,
// maar hier in die blaaier sodat die mens dit SIEN voordat
// hulle probeer. Dit is wat die navorsing vra: die vereistes
// hoort op die skerm, nie as 'n verrassing ná die eerste
// probeerslag nie.

const REELS = [
  { id: 'lengte',     teks: 'Minstens 12 karakters',         toets: (w) => w.length >= 12 },
  { id: 'hoofletter', teks: "'n Hoofletter (A–Z)",           toets: (w) => /[A-Z]/.test(w) },
  { id: 'kleinletter',teks: "'n Kleinletter (a–z)",          toets: (w) => /[a-z]/.test(w) },
  { id: 'syfer',      teks: "'n Syfer (0–9)",                toets: (w) => /[0-9]/.test(w) },
  { id: 'spesiaal',   teks: "'n Spesiale karakter (!@#…)",   toets: (w) => /[^A-Za-z0-9\s]/.test(w) },
];

export function wagwoordVoldoen(wagwoord) {
  return REELS.every((r) => r.toets(wagwoord ?? ''));
}

/**
 * 'n Kort lysie wat regmerk terwyl die mens tik.
 * Die lys is aria-live, so 'n skermleser hoor die vordering
 * sonder dat die mens iets hoef te doen.
 */
export default function WagwoordSterkte({ wagwoord }) {
  const waarde = wagwoord ?? '';

  return (
    <ul className="sterkte" aria-live="polite">
      {REELS.map((reel) => {
        const reg = reel.toets(waarde);
        return (
          <li key={reel.id} className={`sterkte__reel${reg ? ' sterkte__reel--reg' : ''}`}>
            <span className="sterkte__teken" aria-hidden="true">{reg ? '✓' : '○'}</span>
            <span>{reel.teks}</span>
            <span className="slegs-skermleser">{reg ? ' — voldoen' : ' — voldoen nie'}</span>
          </li>
        );
      })}
    </ul>
  );
}
