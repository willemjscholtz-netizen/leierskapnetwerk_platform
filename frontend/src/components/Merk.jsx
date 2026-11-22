import './Merk.css';

/**
 * Die platform se kenteken.
 *
 * As public/logo.png bestaan, gebruik ons dit. Anders val ons
 * terug op die getekende kenteken hieronder, sodat die bladsy
 * nooit sonder 'n merk staan nie.
 *
 * grootte: 'klein' | 'normaal' | 'groot'
 * metNaam: wys die naam langs die kenteken
 */
export default function Merk({ grootte = 'normaal', metNaam = true }) {
  return (
    <div className={`merk merk--${grootte}`}>
      <img
        className="merk__beeld"
        src="/logo.png"
        alt={metNaam ? '' : 'Leierskapnetwerk'}
        aria-hidden={metNaam ? 'true' : undefined}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      {metNaam && <span className="merk__naam">Leierskapnetwerk</span>}
    </div>
  );
}
