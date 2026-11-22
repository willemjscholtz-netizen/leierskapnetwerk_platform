import './Veld.css';

/**
 * Een vormveld met alles wat WCAG 2.2 vra:
 *
 *  - 'n sigbare etiket BO die veld ('n plekhouer verdwyn sodra
 *    iemand tik, so dit is nie 'n etiket nie)
 *  - 'n id wat die etiket programmaties aan die veld koppel
 *  - aria-describedby wat die hulpteks en die foutboodskap
 *    aan die veld verbind
 *  - aria-invalid wanneer daar 'n fout is
 *  - role="alert" op die fout, sodat 'n skermleser dit hoor
 *
 * fout: 'n string met die rede, of null
 */
export default function Veld({
  id,
  etiket,
  hulp,
  fout,
  verpligtend = false,
  tipe = 'text',
  waarde,
  opVerandering,
  ...res
}) {
  const idFout = fout ? `${id}-fout` : undefined;
  const idHulp = hulp ? `${id}-hulp` : undefined;
  const beskryfDeur = [idHulp, idFout].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`veld${fout ? ' veld--fout' : ''}`}>
      <label className="veld__etiket" htmlFor={id}>
        {etiket}
        {verpligtend && <span className="veld__verpligtend" aria-hidden="true"> *</span>}
      </label>

      {hulp && <p className="veld__hulp" id={idHulp}>{hulp}</p>}

      <input
        id={id}
        type={tipe}
        className="veld__inset"
        value={waarde}
        onChange={(e) => opVerandering(e.target.value)}
        required={verpligtend}
        aria-invalid={fout ? 'true' : undefined}
        aria-describedby={beskryfDeur}
        {...res}
      />

      {fout && (
        <p className="veld__fout" id={idFout} role="alert">{fout}</p>
      )}
    </div>
  );
}
