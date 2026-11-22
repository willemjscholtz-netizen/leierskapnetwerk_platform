import { useState } from 'react';
import Merk from '../components/Merk';
import Knoppie from '../components/Knoppie';
import Veld from '../components/Veld';
import Mededeling from '../components/Mededeling';
import { api } from '../lib/api';
import { maakFoonSkoon } from '../lib/foon';
import './VoltooiProfiel.css';

/**
 * Die skerm wat wys wanneer 'n gebruiker se profiel onvolledig is.
 *
 * Dit teken NET die velde wat werklik ontbreek - nie 'n lang
 * vorm met goed wat reeds ingevul is nie. Die mens hoef net die
 * gate te vul.
 *
 * velde:   die lys uit GET /api/profiel/volledigheid
 * opVoltooi: word geroep wanneer alles gestoor is
 */
export default function VoltooiProfiel({ gebruiker, velde, opVoltooi }) {
  const [waardes, setWaardes] = useState({});
  const [ligging, setLigging] = useState(null);
  const [foute, setFoute] = useState({});
  const [fout, setFout] = useState(null);
  const [besig, setBesig] = useState(false);
  const [liggingBesig, setLiggingBesig] = useState(false);
  const [liggingFout, setLiggingFout] = useState(null);

  function stel(naam, waarde) {
    setWaardes((v) => ({ ...v, [naam]: waarde }));
  }

  async function kryLigging() {
    setLiggingFout(null);

    if (!navigator.geolocation) {
      setLiggingFout('Jou blaaier ondersteun nie ligging nie.');
      return;
    }

    setLiggingBesig(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLigging({
          locationLat: pos.coords.latitude,
          locationLng: pos.coords.longitude,
        });
        setLiggingBesig(false);
      },
      (err) => {
        setLiggingBesig(false);
        setLiggingFout(
          err.code === 1
            ? 'Jy het ligging geweier. Jy kan dit later bywerk, maar die veld is nodig.'
            : 'Kon nie jou ligging kry nie. Probeer weer.'
        );
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }

  function kontroleer() {
    const nuwe = {};

    for (const veld of velde) {
      if (veld.tipe === 'ligging') {
        if (!ligging) nuwe[veld.naam] = 'Ons het jou ligging nodig.';
        continue;
      }
      const waarde = waardes[veld.naam];
      if (!waarde || String(waarde).trim() === '') {
        nuwe[veld.naam] = `${veld.etiket} is nodig.`;
      }
    }

    setFoute(nuwe);
    return Object.keys(nuwe).length === 0;
  }

  async function stoor(e) {
    e.preventDefault();
    setFout(null);
    if (!kontroleer()) return;

    setBesig(true);
    try {
      const liggaam = {};

      for (const veld of velde) {
        if (veld.tipe === 'ligging') continue;
        // 'n Foonnommer word skoon gestoor - net die syfers
        if (veld.tipe === 'tel') {
          liggaam[veld.naam] = maakFoonSkoon(waardes[veld.naam]);
        } else {
          liggaam[veld.naam] = waardes[veld.naam];
        }
      }

      if (ligging) {
        liggaam.locationLat = ligging.locationLat;
        liggaam.locationLng = ligging.locationLng;
      }

      await api.profielBywerk(liggaam);
      opVoltooi?.();
    } catch (err) {
      setFout(err.message);
    } finally {
      setBesig(false);
    }
  }

  return (
    <div className="voltooi">
      <div className="voltooi__kop">
        <Merk />
      </div>

      <div className="voltooi__kaart">
        <h1 className="voltooi__kopteks">
          Net nog {velde.length === 1 ? 'een ding' : `${velde.length} goed`}
        </h1>

        <p className="voltooi__inleiding">
          {gebruiker?.first_name ? `Hallo ${gebruiker.first_name}. ` : ''}
          Ons kort nog bietjie inligting voordat jy by projekte betrokke kan raak.
        </p>

        {fout && <Mededeling tipe="fout">{fout}</Mededeling>}

        <form onSubmit={stoor} noValidate>
          {velde.map((veld) => {
            if (veld.tipe === 'ligging') {
              return (
                <div className="veld" key={veld.naam}>
                  <span className="veld__etiket">
                    {veld.etiket}
                    <span className="veld__verpligtend" aria-hidden="true"> *</span>
                  </span>
                  {veld.hulp && <p className="veld__hulp">{veld.hulp}</p>}

                  {ligging ? (
                    <p className="voltooi__ligging-ok" role="status">
                      Ligging ontvang
                    </p>
                  ) : (
                    <Knoppie
                      variant="sekondere"
                      volWydte
                      besig={liggingBesig}
                      onClick={kryLigging}
                    >
                      Kry my ligging
                    </Knoppie>
                  )}

                  {liggingFout && (
                    <p className="veld__fout" role="alert">{liggingFout}</p>
                  )}
                  {foute[veld.naam] && !ligging && (
                    <p className="veld__fout" role="alert">{foute[veld.naam]}</p>
                  )}
                </div>
              );
            }

            if (veld.tipe === 'keuse') {
              return (
                <div className="veld" key={veld.naam}>
                  <label className="veld__etiket" htmlFor={veld.naam}>
                    {veld.etiket}
                    <span className="veld__verpligtend" aria-hidden="true"> *</span>
                  </label>
                  <select
                    id={veld.naam}
                    className="veld__inset"
                    value={waardes[veld.naam] ?? ''}
                    onChange={(e) => stel(veld.naam, e.target.value)}
                    aria-invalid={foute[veld.naam] ? 'true' : undefined}
                  >
                    <option value="">(kies een)</option>
                    {veld.keuses.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                  {foute[veld.naam] && (
                    <p className="veld__fout" role="alert">{foute[veld.naam]}</p>
                  )}
                </div>
              );
            }

            return (
              <Veld
                key={veld.naam}
                id={veld.naam}
                etiket={veld.etiket}
                tipe={veld.tipe}
                hulp={veld.hulp}
                verpligtend
                autoComplete={veld.autoComplete}
                waarde={waardes[veld.naam] ?? ''}
                opVerandering={(v) => stel(veld.naam, v)}
                fout={foute[veld.naam]}
              />
            );
          })}

          <Knoppie tipe="submit" volWydte besig={besig}>
            Stoor en gaan voort
          </Knoppie>
        </form>
      </div>
    </div>
  );
}
