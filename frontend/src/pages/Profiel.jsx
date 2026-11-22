import { useEffect, useState, useRef } from 'react';
import Uitleg from '../components/Uitleg';
import Kopbalk from '../components/Kopbalk';
import Knoppie from '../components/Knoppie';
import Veld from '../components/Veld';
import Mededeling from '../components/Mededeling';
import PenIkoon from '../components/PenIkoon';
import PrentSnyer from '../components/PrentSnyer';
import { api } from '../lib/api';
import { vertoonFoon, maakFoonSkoon } from '../lib/foon';
import './Profiel.css';

const GESLAG_OPSIES = ['Manlik', 'Vroulik', 'Ander', 'Sê liewer nie'];

// Die datum kom as 'n ISO-string met 'n tydsone. Ons wil die dag
// wys soos dit in Suid-Afrika is, nie in UTC nie - anders lyk
// 1 Februarie soos 31 Januarie.
function formatDatum(waarde) {
  if (!waarde) return null;
  const d = new Date(waarde);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('af-ZA', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// vir die <input type="date"> het ons die JJJJ-MM-DD-vorm nodig,
// in PLAASLIKE tyd - nie die ISO-string nie.
function datumVirInset(waarde) {
  if (!waarde) return '';
  const d = new Date(waarde);
  if (Number.isNaN(d.getTime())) return '';
  const jaar = d.getFullYear();
  const maand = String(d.getMonth() + 1).padStart(2, '0');
  const dag = String(d.getDate()).padStart(2, '0');
  return `${jaar}-${maand}-${dag}`;
}

function Reël({ etiket, waarde, leeg = 'Nie ingevul nie' }) {
  return (
    <div className="profiel__reel">
      <dt className="profiel__etiket">{etiket}</dt>
      <dd className={`profiel__waarde${waarde ? '' : ' profiel__waarde--leeg'}`}>
        {waarde || leeg}
      </dd>
    </div>
  );
}

export default function Profiel({ gebruiker, opTuis, opUitteken, opBygewerk }) {
  const [profiel, setProfiel] = useState(null);
  const [laai, setLaai] = useState(true);
  const [fout, setFout] = useState(null);

  const [wysig, setWysig] = useState(false);
  const [waardes, setWaardes] = useState({});
  const [foute, setFoute] = useState({});
  const [stoorFout, setStoorFout] = useState(null);
  const [sukses, setSukses] = useState(null);
  const [besig, setBesig] = useState(false);

  // Die prent
  const [gekoseLêer, setGekoseLêer] = useState(null);   // File -> die snyer
  const [prentFout, setPrentFout] = useState(null);
  const lêerVeld = useRef(null);

  useEffect(() => {
    api.profiel()
      .then((data) => setProfiel(data.user))
      .catch((err) => setFout(err.message))
      .finally(() => setLaai(false));
  }, []);

  useEffect(() => {
    if (!wysig || !profiel) return;
    setWaardes({
      firstName: profiel.first_name ?? '',
      lastName: profiel.last_name ?? '',
      contactNumber: vertoonFoon(profiel.contact_number) ?? '',
      dateOfBirth: datumVirInset(profiel.date_of_birth),
      gender: profiel.gender ?? '',
    });
    setFoute({});
    setStoorFout(null);
    setSukses(null);
  }, [wysig, profiel]);

  function stel(naam, waarde) {
    setWaardes((v) => ({ ...v, [naam]: waarde }));
  }

  function kontroleer() {
    const nuwe = {};
    if (!waardes.firstName?.trim()) nuwe.firstName = 'Naam kan nie leeg wees nie.';
    if (!waardes.lastName?.trim()) nuwe.lastName = 'Van kan nie leeg wees nie.';
    if (!waardes.dateOfBirth) {
      nuwe.dateOfBirth = 'Geboortedatum is nodig.';
    } else if (new Date(waardes.dateOfBirth) > new Date()) {
      nuwe.dateOfBirth = 'Die datum kan nie in die toekoms wees nie.';
    }
    setFoute(nuwe);
    return Object.keys(nuwe).length === 0;
  }

  function verskille() {
    const uit = {};
    const oorspronklik = {
      firstName: profiel.first_name ?? '',
      lastName: profiel.last_name ?? '',
      contactNumber: profiel.contact_number ?? '',
      dateOfBirth: datumVirInset(profiel.date_of_birth),
      gender: profiel.gender ?? '',
    };

    for (const [sleutel, waarde] of Object.entries(oorspronklik)) {
      let nuwe = (waardes[sleutel] ?? '').toString().trim();
      let oud = waarde.toString().trim();

      // Die kontaknommer word skoon gestoor. Ons vergelyk die
      // SKOON weergawes, anders lyk "082 823 9446" soos 'n
      // verandering teenoor "0828239446".
      if (sleutel === 'contactNumber') {
        nuwe = maakFoonSkoon(nuwe) ?? '';
        oud = maakFoonSkoon(oud) ?? '';
      }

      if (nuwe !== oud) uit[sleutel] = nuwe || null;
    }

    return uit;
  }

  async function stoor(e) {
    e.preventDefault();
    setStoorFout(null);
    setSukses(null);
    if (!kontroleer()) return;

    const liggaam = verskille();

    if (Object.keys(liggaam).length === 0) {
      setSukses('Niks het verander nie.');
      setWysig(false);
      return;
    }

    setBesig(true);
    try {
      const data = await api.profielBywerk(liggaam);
      setProfiel(data.user);
      setWysig(false);
      setSukses('Jou profiel is bygewerk.');
      opBygewerk?.(data.user);
    } catch (err) {
      setStoorFout(err.message);
    } finally {
      setBesig(false);
    }
  }

  function kanselleer() {
    setWysig(false);
    setFoute({});
    setStoorFout(null);
  }

  // --- Die prent ------------------------------------------------
  function kiesLêer(e) {
    const lêer = e.target.files?.[0];
    e.target.value = '';   // sodat dieselfde lêer weer gekies kan word
    if (!lêer) return;
    setPrentFout(null);
    setGekoseLêer(lêer);
  }

  async function stoorPrent(data) {
    try {
      await api.stoorPrent(data);
      const nuwe = await api.profiel();
      setProfiel(nuwe.user);
      opBygewerk?.(nuwe.user);
      setGekoseLêer(null);
      setSukses('Jou profielprent is opgedateer.');
    } catch (err) {
      setPrentFout(err.message);
    }
  }

  const g = profiel ?? {};

  const providerNaam = {
    local: 'E-posadres en wagwoord',
    google: 'Google',
    meta: 'Meta',
  }[g.auth_provider] ?? g.auth_provider;

  // Die ligging onder die naam.
  //
  // Ons wys die pleknaam as ons een het (location_text), en
  // anders net die koördinate. Sonder 'n pleknaam is die getalle
  // nie baie menslik nie, maar dit is beter as niks - en dit wys
  // dat die ligging opgeneem is.
  const liggingTeks = (() => {
    const hetKoordinate =
      g.location_lat !== null && g.location_lat !== undefined &&
      g.location_lng !== null && g.location_lng !== undefined;

    if (g.location_text && hetKoordinate) {
      return `${g.location_text} · ${Number(g.location_lat).toFixed(4)}, ${Number(g.location_lng).toFixed(4)}`;
    }
    if (g.location_text) return g.location_text;
    if (hetKoordinate) {
      return `${Number(g.location_lat).toFixed(4)}, ${Number(g.location_lng).toFixed(4)}`;
    }
    return null;
  })();

  const voorletters = [g.first_name, g.last_name]
    .filter(Boolean)
    .map((s) => s.trim()[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Uitleg
      header={
        <Kopbalk
          voor={
            <button type="button" className="kopbalk__terug" onClick={opTuis}>
              ← Terug
            </button>
          }
          gebruiker={gebruiker}
          opProfiel={() => {}}
          opUitteken={opUitteken}
        />
      }
      links={
        <div className="sy-inhoud">
          <p className="sy-inhoud__titel">Navigasie</p>
          <p className="sy-inhoud__leeg">Kom binnekort</p>
        </div>
      }
      regs={
        <div className="sy-inhoud">
          <p className="sy-inhoud__titel">Voorstelle</p>
          <p className="sy-inhoud__leeg">Kom binnekort</p>
        </div>
      }
    >
      <div className="profiel__liggaam">
        {/* --- Die ronde profielprent ------------------------- */}
        <div className="profiel__prentblok">
          <button
            type="button"
            className="profiel__prent"
            onClick={() => lêerVeld.current?.click()}
            aria-label="Verander jou profielprent"
            title="Verander jou profielprent"
          >
            {g.profile_photo ? (
              <img src={g.profile_photo} alt="" className="profiel__prentbeeld" />
            ) : (
              <span className="profiel__voorletters" aria-hidden="true">
                {voorletters || '?'}
              </span>
            )}
            <span className="profiel__prent-oorleg" aria-hidden="true">
              Verander
            </span>
          </button>

          {/* Die verborge lêer-kiesser */}
          <input
            ref={lêerVeld}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="slegs-skermleser"
            onChange={kiesLêer}
            aria-label="Kies \u0027n prentlêer"
          />

          <div className="profiel__naamblok">
            <p className="profiel__prentnaam">
              {[g.first_name, g.last_name].filter(Boolean).join(" ")}
            </p>
            {liggingTeks && (
              <p className="profiel__ligging">{liggingTeks}</p>
            )}
          </div>

          {prentFout && <Mededeling tipe="fout">{prentFout}</Mededeling>}
        </div>

        {fout && <Mededeling tipe="fout">{fout}</Mededeling>}
        {sukses && !wysig && <Mededeling tipe="sukses">{sukses}</Mededeling>}

        {laai ? (
          <p>Laai…</p>
        ) : wysig ? (
          /* ---------------- WYSIG-MODUS ---------------- */
          <form onSubmit={stoor} noValidate>
            <section className="profiel__kaart">
              <h2 className="profiel__afdeling">Persoonlike inligting</h2>

              {stoorFout && <Mededeling tipe="fout">{stoorFout}</Mededeling>}

              <Veld
                id="firstName" etiket="Naam" verpligtend
                waarde={waardes.firstName ?? ''}
                opVerandering={(v) => stel('firstName', v)}
                fout={foute.firstName}
                autoComplete="given-name"
              />
              <Veld
                id="lastName" etiket="Van" verpligtend
                waarde={waardes.lastName ?? ''}
                opVerandering={(v) => stel('lastName', v)}
                fout={foute.lastName}
                autoComplete="family-name"
              />
              <Veld
                id="contactNumber" etiket="Kontaknommer" tipe="tel"
                waarde={waardes.contactNumber ?? ''}
                opVerandering={(v) => stel('contactNumber', v)}
                autoComplete="tel"
              />
              <Veld
                id="dateOfBirth" etiket="Geboortedatum" tipe="date" verpligtend
                waarde={waardes.dateOfBirth ?? ''}
                opVerandering={(v) => stel('dateOfBirth', v)}
                fout={foute.dateOfBirth}
                autoComplete="bday"
              />

              <div className="veld">
                <label className="veld__etiket" htmlFor="gender">Geslag</label>
                <select
                  id="gender"
                  className="veld__inset"
                  value={waardes.gender ?? ''}
                  onChange={(e) => stel('gender', e.target.value)}
                >
                  <option value="">(kies een)</option>
                  {GESLAG_OPSIES.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
            </section>

            <div className="profiel__knoppies">
              <Knoppie tipe="submit" besig={besig}>Stoor</Knoppie>
              <Knoppie variant="sekondere" onClick={kanselleer} disabled={besig}>
                Kanselleer
              </Knoppie>
            </div>
          </form>
        ) : (
          /* ---------------- LEES-MODUS ---------------- */
          <>
            <section className="profiel__kaart">
              <div className="profiel__afdelingry">
                <h2 className="profiel__afdeling">Persoonlike inligting</h2>
                <PenIkoon
                  etiket="Wysig persoonlike inligting"
                  opKlik={() => setWysig(true)}
                />
              </div>
              <dl className="profiel__lys">
                <Reël etiket="Naam" waarde={g.first_name} />
                <Reël etiket="Van" waarde={g.last_name} />
                <Reël etiket="E-posadres" waarde={g.email} />
                <Reël etiket="Kontaknommer" waarde={vertoonFoon(g.contact_number)} />
                <Reël etiket="Geboortedatum" waarde={formatDatum(g.date_of_birth)} />
                <Reël etiket="Ouderdom" waarde={g.age ? `${g.age} jaar` : null} />
                <Reël etiket="Geslag" waarde={g.gender} />
              </dl>
            </section>

            <section className="profiel__kaart">
              <h2 className="profiel__afdeling">Rekening</h2>
              <dl className="profiel__lys">
                <Reël etiket="Aangemeld met" waarde={providerNaam} />
                <Reël
                  etiket="E-posadres bevestig"
                  waarde={g.email_verified ? 'Ja' : 'Nee'}
                />
                <Reël etiket="Rekening geskep" waarde={formatDatum(g.created_at)} />
                <Reël etiket="Laas bygewerk" waarde={formatDatum(g.updated_at)} />
              </dl>
            </section>
          </>
        )}
      </div>

      {/* --- Die sny-skerm ------------------------------------- */}
      {gekoseLêer && (
        <PrentSnyer
          lêer={gekoseLêer}
          opStoor={stoorPrent}
          opKanselleer={() => setGekoseLêer(null)}
        />
      )}
    </Uitleg>
  );
}
