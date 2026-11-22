import './Mededeling.css';

/**
 * 'n Boodskap aan die gebruiker.
 *
 * role="status" laat 'n skermleser dit aankondig wanneer dit
 * verskyn, sonder om die mens se fokus te steel. Dit is wat
 * WCAG 4.1.3 Status Messages vra.
 */
export default function Mededeling({ tipe = 'fout', kinders }) {
  if (!kinders) return null;
  return (
    <div className={`mededeling mededeling--${tipe}`} role="status">
      {kinders}
    </div>
  );
}
