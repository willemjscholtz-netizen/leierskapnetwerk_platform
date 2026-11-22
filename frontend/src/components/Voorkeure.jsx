import { useEffect, useState } from 'react';
import BelangstellingsVeld from './BelangstellingsVeld';
import Knoppie from './Knoppie';
import Mededeling from './Mededeling';
import './Voorkeure.css';

export default function Voorkeure() {
  const [velde, setVelde] = useState([]);
  const [gekies, setGekies] = useState(() => new Set());
  const [oorspronklik, setOorspronklik] = useState(() => new Set());
  const [laai, setLaai] = useState(true);
  const [fout, setFout] = useState(null);
  const [sukses, setSukses] = useState(null);
  const [besig, setBesig] = useState(false);

  useEffect(() => {
    fetch('/api/profiel/voorkeure', { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `Versoek het gefaal (${res.status})`);
        return data;
      })
      .then((data) => {
        const v = data.velde ?? [];
        setVelde(v);
        const gekose = new Set();
        for (const veld of v) {
          for (const o of veld.opsies) {
            if (o.gekies) gekose.add(o.id);
          }
        }
        setGekies(new Set(gekose));
        setOorspronklik(new Set(gekose));
      })
      .catch((err) => setFout(err.message))
      .finally(() => setLaai(false));
  }, []);

  function wissel(id) {
    setSukses(null);
    setGekies((vorige) => {
      const nuwe = new Set(vorige);
      if (nuwe.has(id)) nuwe.delete(id);
      else nuwe.add(id);
      return nuwe;
    });
  }

  const verander =
    [...gekies].sort((a, b) => a - b).join(',') !==
    [...oorspronklik].sort((a, b) => a - b).join(',');

  async function stoor() {
    setBesig(true);
    setFout(null);
    setSukses(null);

    try {
      const res = await fetch('/api/profiel/voorkeure', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ belangstellingIds: [...gekies] }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Kon nie stoor nie (${res.status})`);

      setOorspronklik(new Set(gekies));
      setSukses(
        gekies.size === 0
          ? 'Geen belangstellings gekies nie.'
          : `${gekies.size} belangstelling${gekies.size === 1 ? '' : 'e'} gestoor.`
      );
    } catch (err) {
      setFout(err.message);
    } finally {
      setBesig(false);
    }
  }

  function herstel() {
    setGekies(new Set(oorspronklik));
    setFout(null);
    setSukses(null);
  }

  if (laai) return <p>Laai voorkeure&hellip;</p>;

  return (
    <section className="voorkeure">
      <div className="voorkeure__kop">
        <h2 className="voorkeure__titel">Voorkeure</h2>
        <p className="voorkeure__hulp">
          Kies waarin jy belangstel. Jy kan nul of meer per veld kies.
        </p>
      </div>

      {fout && <Mededeling tipe="fout">{fout}</Mededeling>}
      {sukses && <Mededeling tipe="sukses">{sukses}</Mededeling>}

      {velde.length === 0 ? (
        <p className="voorkeure__leeg">Geen belangstellingsvelde gevind nie.</p>
      ) : (
        <>
          {velde.map((v) => (
            <BelangstellingsVeld
              key={v.id}
              veld={v}
              gekies={gekies}
              opWissel={wissel}
            />
          ))}

          <div className="voorkeure__knoppies">
            <Knoppie onClick={stoor} besig={besig} disabled={!verander}>
              Stoor voorkeure
            </Knoppie>
            {verander && (
              <Knoppie variant="sekondere" onClick={herstel} disabled={besig}>
                Kanselleer
              </Knoppie>
            )}
          </div>
        </>
      )}
    </section>
  );
}
