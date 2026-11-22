import { useState, useEffect, useRef } from 'react';
import './GebruikersIkoon.css';

/**
 * Die gebruikersikoon regs in die header.
 *
 * Die ikoon is 'n sirkel met die mens se voorletters. Dit is
 * beter as 'n generiese persoon-ikoon, want 'n mens herken hul
 * eie voorletters dadelik.
 *
 * Toeganklikheid: die knoppie het aria-expanded en aria-haspopup,
 * en Escape maak die kieslys toe. 'n Klik buite ook.
 */
export default function GebruikersIkoon({ gebruiker, opProfiel, opUitteken }) {
  const [oop, setOop] = useState(false);
  const houer = useRef(null);

  const voorletters = [gebruiker?.first_name, gebruiker?.last_name]
    .filter(Boolean)
    .map((s) => s.trim()[0]?.toUpperCase() ?? '')
    .join('') || '?';

  // Escape maak toe. Dit is wat 'n mens verwag by enige kieslys.
  useEffect(() => {
    if (!oop) return;

    function opSleutel(e) {
      if (e.key === 'Escape') setOop(false);
    }

    document.addEventListener('keydown', opSleutel);
    return () => document.removeEventListener('keydown', opSleutel);
  }, [oop]);

  // 'n Klik buite maak toe.
  useEffect(() => {
    if (!oop) return;

    function opKlik(e) {
      if (houer.current && !houer.current.contains(e.target)) {
        setOop(false);
      }
    }

    document.addEventListener('mousedown', opKlik);
    return () => document.removeEventListener('mousedown', opKlik);
  }, [oop]);

  function kies(aksie) {
    setOop(false);
    aksie?.();
  }

  return (
    <div className="ikoon" ref={houer}>
      <button
        type="button"
        className="ikoon__knoppie"
        onClick={() => setOop((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={oop}
        aria-label={`Rekening van ${gebruiker?.first_name ?? 'gebruiker'}`}
      >
        <span className="ikoon__voorletters" aria-hidden="true">{voorletters}</span>
      </button>

      {oop && (
        <div className="ikoon__kieslys" role="menu">
          <div className="ikoon__kop">
            <strong>
              {[gebruiker?.first_name, gebruiker?.last_name].filter(Boolean).join(' ') || 'Gebruiker'}
            </strong>
            <span className="ikoon__epos">{gebruiker?.email}</span>
          </div>

          <button
            type="button"
            role="menuitem"
            className="ikoon__item"
            onClick={() => kies(opProfiel)}
          >
            Profiel
          </button>

          <button
            type="button"
            role="menuitem"
            className="ikoon__item ikoon__item--uit"
            onClick={() => kies(opUitteken)}
          >
            Teken uit
          </button>
        </div>
      )}
    </div>
  );
}
