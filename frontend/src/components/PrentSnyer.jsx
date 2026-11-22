import { useState, useRef, useEffect, useCallback } from 'react';
import Knoppie from './Knoppie';
import Mededeling from './Mededeling';
import './PrentSnyer.css';

// Die venster waarin die mens sny, en die uitset-grootte.
// 400x400 is skerp genoeg vir 'n 200px-vertoning op 'n skerm
// met dubbel die pixel-digtheid.
const VENSTER = 320;
const UITSET = 400;

/**
 * Die sny-skerm.
 *
 * Die mens het 'n prent gekies. Hier kan hulle:
 *   - die grootte met 'n glyer stel (die zoem)
 *   - die prent skuif om te kies watter deel in die sirkel val
 *
 * lêer:         die File uit die <input type="file">
 * opStoor:      kry die datastring
 * opKanselleer: sluit die skerm
 */
export default function PrentSnyer({ lêer, opStoor, opKanselleur, opKanselleer }) {
  // Ons aanvaar albei spellings van die prop
  const kanselleer = opKanselleer ?? opKanselleur;

  const [beeld, setBeeld] = useState(null);
  const [zoem, setZoem] = useState(1);
  const [skuif, setSkuif] = useState({ x: 0, y: 0 });
  const [sleep, setSleep] = useState(null);
  const [fout, setFout] = useState(null);
  const [besig, setBesig] = useState(false);

  const canvas = useRef(null);

  // --- Laai die lêer in 'n beeld -----------------------------
  useEffect(() => {
    if (!lêer) return;

    if (!lêer.type.startsWith('image/')) {
      setFout('Kies asseblief \u0027n prentlêer.');
      return;
    }

    const url = URL.createObjectURL(lêer);
    const img = new Image();

    img.onload = () => {
      setBeeld(img);
      // Begin met die kleinste zoem wat die venster heeltemal vul
      const kleinste = Math.max(VENSTER / img.width, VENSTER / img.height);
      setZoem(kleinste);
      setSkuif({ x: 0, y: 0 });
      setFout(null);
    };

    img.onerror = () => setFout('Kon nie die prent lees nie.');
    img.src = url;

    return () => URL.revokeObjectURL(url);
  }, [lêer]);

  const wydte = beeld ? beeld.width * zoem : 0;
  const hoogte = beeld ? beeld.height * zoem : 0;

  // --- Sleep om te skuif --------------------------------------
  const opMuisAf = useCallback((e) => {
    if (!beeld) return;
    e.preventDefault();
    setSleep({
      beginX: e.clientX,
      beginY: e.clientY,
      skuifX: skuif.x,
      skuifY: skuif.y,
    });
  }, [beeld, skuif]);

  useEffect(() => {
    if (!sleep) return;

    function opMuisBeweeg(e) {
      setSkuif({
        x: sleep.skuifX + (e.clientX - sleep.beginX),
        y: sleep.skuifY + (e.clientY - sleep.beginY),
      });
    }
    function opMuisOp() { setSleep(null); }

    window.addEventListener('mousemove', opMuisBeweeg);
    window.addEventListener('mouseup', opMuisOp);
    return () => {
      window.removeEventListener('mousemove', opMuisBeweeg);
      window.removeEventListener('mouseup', opMuisOp);
    };
  }, [sleep]);

  // --- Die glyer ------------------------------------------------
  function stelZoemVanGlyer(waarde) {
    if (!beeld) return;
    const kleinste = Math.max(VENSTER / beeld.width, VENSTER / beeld.height);
    setZoem(kleinste * waarde);
  }

  const kleinsteZoem = beeld
    ? Math.max(VENSTER / beeld.width, VENSTER / beeld.height)
    : 1;

  const glyerWaarde = kleinsteZoem ? zoem / kleinsteZoem : 1;

  // --- Stoor: teken die gekose deel ----------------------------
  async function stoor() {
    // EERSTE REEL: wys dadelik iets. So weet ons of die klik
    // die funksie bereik het.
    setFout('GEKLIK teen ' + new Date().toLocaleTimeString('af-ZA'));

    if (!beeld) {
      setFout('Geen prent gelaai nie - die knoppie is doodgemaak.');
      return;
    }
    if (!canvas.current) {
      setFout('Kon nie die prent verwerk nie. Herlaai die bladsy en probeer weer.');
      return;
    }

    setBesig(true);
    setFout(null);

    try {
      const doek = canvas.current;
      doek.width = UITSET;
      doek.height = UITSET;

      const ctx = doek.getContext('2d');
      if (!ctx) {
        throw new Error('Die blaaier kon nie die prent verwerk nie');
      }

      // Waar die prent se hoekpunte in die venster val
      const beeldX = (VENSTER - wydte) / 2 + skuif.x;
      const beeldY = (VENSTER - hoogte) / 2 + skuif.y;

      // Watter deel van die OORSPRONKLIKE prent is sigbaar?
      const bronX = (0 - beeldX) / zoem;
      const bronY = (0 - beeldY) / zoem;
      const bronW = VENSTER / zoem;
      const bronH = VENSTER / zoem;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, UITSET, UITSET);
      ctx.drawImage(beeld, bronX, bronY, bronW, bronH, 0, 0, UITSET, UITSET);

      const data = doek.toDataURL('image/png');

      if (!data || data.length < 100) {
        throw new Error('Die prent kon nie geskep word nie');
      }

      await opStoor(data);
      // Die ouer komponent sluit die skerm wanneer dit klaar is.
      // As dit nie doen nie, sluit ons self.
      setBesig(false);
    } catch (err) {
      console.error('Sny het gefaal:', err);
      setFout(err.message || 'Kon nie die prent stoor nie');
      setBesig(false);
    }
  }

  return (
    <div className="sny-agtergrond" role="dialog" aria-modal="true" aria-label="Sny profielprent">
      <div className="sny">
        <h2 className="sny__titel">Sny jou profielprent</h2>
        <p className="sny__hulp">
          Sleep die prent om te skuif. Gebruik die glyer om dit groter of kleiner te maak.
        </p>

        {fout && <Mededeling tipe="fout">{fout}</Mededeling>}

        <div
          className="sny__venster"
          onMouseDown={opMuisAf}
          style={{ cursor: sleep ? 'grabbing' : 'grab', width: VENSTER, height: VENSTER }}
        >
          {beeld && (
            <img
              src={beeld.src}
              alt=""
              draggable="false"
              className="sny__beeld"
              style={{
                width: wydte,
                height: hoogte,
                left: (VENSTER - wydte) / 2 + skuif.x,
                top: (VENSTER - hoogte) / 2 + skuif.y,
              }}
            />
          )}
          <span className="sny__sirkel" aria-hidden="true" />
        </div>

        <label className="sny__glyer" htmlFor="zoem">
          <span className="sny__glyer-etiket">Grootte</span>
          <input
            id="zoem"
            type="range"
            min="1"
            max="4"
            step="0.01"
            value={glyerWaarde}
            onChange={(e) => stelZoemVanGlyer(Number(e.target.value))}
          />
        </label>

        <div className="sny__knoppies">
          <Knoppie onClick={stoor} besig={besig} disabled={!beeld}>
            Stoor
          </Knoppie>
          <Knoppie variant="sekondere" onClick={kanselleer} disabled={besig}>
            Kanselleer
          </Knoppie>
        </div>

        {/*
          Die canvas waarop ons die finale prent teken.

          LET WEL: dit is NIE display:none nie. 'n Element met
          display:none het geen breedte of hoogte, en dan kan die
          canvas nie teken nie - die stoor sou vir ewig hang.

          Ons plaas dit eerder buite die sigbare area: position
          absolute met 'n negatiewe linkerkant. Dit het werklike
          afmetings en niemand sien dit.
        */}
        <canvas
          ref={canvas}
          width={UITSET}
          height={UITSET}
          style={{ position: 'absolute', left: '-9999px', top: 0 }}
        />
      </div>
    </div>
  );
}
