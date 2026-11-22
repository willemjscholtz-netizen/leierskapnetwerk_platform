import './Uitleg.css';

/**
 * Die raamwerk wat ELKE bladsy gebruik.
 *
 *   header:  vol breedte, bly heeltyd bo
 *   links:   die linkerkantse sybalk (300px)
 *   regs:    die regterkantse sybalk (300px)
 *   kinders: die inhoud in die middel
 *
 * Enige deel is opsioneel. Sonder 'n sybalk word die kolom
 * eenvoudig oorgeslaan en kry die inhoud meer plek - maar die
 * header en die 100%-hoogte bly altyd.
 */
export default function Uitleg({ header, links, regs, children }) {
  const hetLinks = Boolean(links);
  const hetRegs = Boolean(regs);

  return (
    <div className="uitleg">
      {header && <header className="uitleg__kop">{header}</header>}

      <div
        className={[
          'uitleg__romp',
          hetLinks ? 'uitleg__romp--links' : '',
          hetRegs ? 'uitleg__romp--regs' : '',
        ].filter(Boolean).join(' ')}
      >
        {hetLinks && (
          <aside className="uitleg__sy uitleg__sy--links" aria-label="Linkerkantse sybalk">
            {links}
          </aside>
        )}

        <main className="uitleg__inhoud">{children}</main>

        {hetRegs && (
          <aside className="uitleg__sy uitleg__sy--regs" aria-label="Regterkantse sybalk">
            {regs}
          </aside>
        )}
      </div>
    </div>
  );
}
