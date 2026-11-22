import './PenIkoon.css';

/**
 * 'n Klein pen-ikoon wat sê: hierdie afdeling kan gewysig word.
 *
 * Dit is 'n knoppie, nie net 'n prentjie nie. 'n Blote ikoon sê
 * niks vir 'n skermleser, so dit het 'n aria-label. En dit het
 * 'n title sodat 'n mens met die muis weet wat dit doen voordat
 * hulle klik.
 */
export default function PenIkoon({ opKlik, etiket = 'Wysig' }) {
  return (
    <button
      type="button"
      className="pen-ikoon"
      onClick={opKlik}
      aria-label={etiket}
      title={etiket}
    >
      <svg
        viewBox="0 0 20 20"
        width="16"
        height="16"
        aria-hidden="true"
        focusable="false"
      >
        {/* Die pen: 'n skuins lyf met 'n punt onder en 'n plat
            kant bo. */}
        <path
          d="M13.6 2.9a1.6 1.6 0 0 1 2.3 0l1.2 1.2a1.6 1.6 0 0 1 0 2.3l-9.4 9.4-3.9 1 1-3.9 9.4-9.4zm1.1 1.1-9.1 9.1-.5 2 2-.5 9.1-9.1-1.5-1.5z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
