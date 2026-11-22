import { useState } from 'react';
import './BelangstellingsVeld.css';

export default function BelangstellingsVeld({ veld, gekies, opWissel }) {
  const [oop, setOop] = useState(false);
  const gekose = veld.opsies.filter((o) => gekies.has(o.id));

  return (
    <div className="bveld">
      <div className="bveld__kop">
        <h3 className="bveld__naam">{veld.naam}</h3>
        <span className="bveld__telling">
          {gekose.length > 0 ? `${gekose.length} gekies` : 'Niks gekies nie'}
        </span>
      </div>

      {gekose.length > 0 && (
        <ul className="bveld__skyfies">
          {gekose.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="skyfie"
                onClick={() => opWissel(o.id)}
                aria-label={`Verwyder ${o.naam}`}
                title={`Verwyder ${o.naam}`}
              >
                <span className="skyfie__naam">{o.naam}</span>
                <span className="skyfie__kruis" aria-hidden="true">&times;</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="bveld__oop"
        onClick={() => setOop((v) => !v)}
        aria-expanded={oop}
      >
        {oop ? 'Maak toe' : 'Kies uit ' + veld.opsies.length + ' belangstellings'}
      </button>

      {oop && (
        <ul className="bveld__lys">
          {veld.opsies.map((o) => {
            const isGekies = gekies.has(o.id);
            return (
              <li key={o.id}>
                <label className={'opsie' + (isGekies ? ' opsie--gekies' : '')}>
                  <input
                    type="checkbox"
                    checked={isGekies}
                    onChange={() => opWissel(o.id)}
                  />
                  <span>{o.naam}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
