import './Knoppie.css';

/**
 * Die knoppie.
 *
 * variant:  'primere' | 'sekondere' | 'stil'
 * volWydte: strek oor die volle breedte
 * besig:    wys 'Besig...' en blokkeer klikke
 * tipe:     'button' | 'submit'
 *
 * LET WEL: die prop heet `children`, nie `kinders` nie.
 * React gee die inhoud tussen <Knoppie>...</Knoppie> as die
 * spesiale prop `children` deur. Enige ander naam is leeg.
 */
export default function Knoppie({
  variant = 'primere',
  volWydte = false,
  besig = false,
  tipe = 'button',
  disabled = false,
  onClick,
  children,
}) {
  const klasse = ['knoppie', `knoppie-${variant}`];
  if (volWydte) klasse.push('knoppie-vol');

  return (
    <button
      type={tipe}
      className={klasse.join(' ')}
      disabled={disabled || besig}
      aria-busy={besig ? 'true' : undefined}
      onClick={onClick}
    >
      {besig ? 'Besig…' : children}
    </button>
  );
}
