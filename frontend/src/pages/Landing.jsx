import { useState } from 'react';
import Merk from '../components/Merk';
import Knoppie from '../components/Knoppie';
import Veld from '../components/Veld';
import Mededeling from '../components/Mededeling';
import WagwoordSterkte, { wagwoordVoldoen } from '../components/WagwoordSterkte';
import { api } from '../lib/api';
import { kryCaptchaToken } from '../lib/recaptcha';
import { kryLigging } from '../lib/ligging';
import { maakFoonSkoon } from '../lib/foon';
import './Landing.css';

export default function Landing({ onIngeteken }) {
  // 'teken-in' | 'registreer'
  const [modus, setModus] = useState('teken-in');

  const [epos, setEpos] = useState('');
  const [wagwoord, setWagwoord] = useState('');
  const [toonWagwoord, setToonWagwoord] = useState(false);
  const [onthouMy, setOnthouMy] = useState(true);

  const [naam, setNaam] = useState('');
  const [van, setVan] = useState('');
  const [kontak, setKontak] = useState('');
  const [geboortedatum, setGeboortedatum] = useState('');

  const [besig, setBesig] = useState(false);
  const [fout, setFout] = useState(null);
  const [sukses, setSukses] = useState(null);
  const [veldfoute, setVeldfoute] = useState({});

  function wisselModus(nuwe) {
    setModus(nuwe);
    setFout(null);
    setSukses(null);
    setVeldfoute({});
  }

  function kontroleerRegistrasie() {
    const foute = {};
    if (!epos.trim()) foute.epos = 'Voer jou e-posadres in.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epos.trim()))
      foute.epos = 'Dit lyk nie soos \u0027n e-posadres nie. Voorbeeld: jan@voorbeeld.co.za';
    if (!naam.trim()) foute.naam = 'Voer jou naam in.';
    if (!van.trim()) foute.van = 'Voer jou van in.';
    if (!wagwoord) foute.wagwoord = 'Kies \u0027n wagwoord.';
    else if (!wagwoordVoldoen(wagwoord))
      foute.wagwoord = 'Die wagwoord voldoen nog nie aan al die vereistes hierbo nie.';
    setVeldfoute(foute);
    return Object.keys(foute).length === 0;
  }

  async function hanteerRegistrasie(e) {
    e.preventDefault();
    setFout(null);
    setSukses(null);
    if (!kontroleerRegistrasie()) return;

    setBesig(true);
    try {
      const recaptchaToken = await kryCaptchaToken('registreer');
      await api.registreer({
        email: epos.trim().toLowerCase(),
        password: wagwoord,
        firstName: naam.trim(),
        lastName: van.trim(),
        contactNumber: maakFoonSkoon(kontak),
        dateOfBirth: geboortedatum || null,
        recaptchaToken,
      });
      setSukses(
        `Kyk in ${epos.trim()} se inkassie vir die skakel om jou e-posadres te bevestig.`
      );
      setWagwoord('');
    } catch (err) {
      setFout(err.message);
      if (err.details?.length) setVeldfoute({ wagwoord: err.details.join(' ') });
    } finally {
      setBesig(false);
    }
  }

  async function hanteerInteken(e) {
    e.preventDefault();
    setFout(null);
    setSukses(null);

    const foute = {};
    if (!epos.trim()) foute.epos = 'Voer jou e-posadres in.';
    if (!wagwoord) foute.wagwoord = 'Voer jou wagwoord in.';
    setVeldfoute(foute);
    if (Object.keys(foute).length) return;

    setBesig(true);
    try {
      const recaptchaToken = await kryCaptchaToken('teken_in');

      // Die ligging word by ELKE aanmelding opgeneem. Die blaaier
      // vra een keer toestemming; daarna gaan dit stil.
      // kryLigging() misluk nooit - dit gee null as die mens
      // weier, en dan teken ons steeds in.
      const ligging = await kryLigging();

      const data = await api.tekenIn({
        email: epos.trim().toLowerCase(),
        password: wagwoord,
        rememberMe: onthouMy,
        recaptchaToken,
        ...(ligging ?? {}),
      });
      onIngeteken?.(data.user);
    } catch (err) {
      setFout(err.message);
    } finally {
      setBesig(false);
    }
  }

  return (
    <div className="landing">
      {/* --- Links: die storie --------------------------------- */}
      <section className="landing__storie">
        <Merk grootte="groot" />

        <h1 className="landing__hooflyn">
          Die brug tussen gemeenskapsprojekte en die mense wat daaraan wil bou.
        </h1>

        <p className="landing__sub">
          Registreer jou projek, of sluit aan om by een betrokke te raak —
          as vrywilliger, skenker, bondgenoot of begunstigde.
        </p>

        <ul className="landing__punte">
          <li>Registreer 'n gemeenskapsprojek in 'n paar minute</li>
          <li>Vind projekte naby jou</li>
          <li>Kies self hoe jy wil bydra</li>
        </ul>
      </section>

      {/* --- Regs: die vorm ----------------------------------- */}
      <section className="landing__vorm" aria-labelledby="vorm-kop">
        <div className="landing__kaart">
          <div className="oortjies" role="tablist" aria-label="Teken in of registreer">
            <button
              role="tab"
              type="button"
              aria-selected={modus === 'teken-in'}
              className={`oortjie${modus === 'teken-in' ? ' oortjie--aktief' : ''}`}
              onClick={() => wisselModus('teken-in')}
            >
              Teken in
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={modus === 'registreer'}
              className={`oortjie${modus === 'registreer' ? ' oortjie--aktief' : ''}`}
              onClick={() => wisselModus('registreer')}
            >
              Registreer
            </button>
          </div>

          <h2 id="vorm-kop" className="landing__vormkop">
            {modus === 'teken-in' ? 'Welkom terug' : 'Skep jou rekening'}
          </h2>

          {fout && <Mededeling tipe="fout">{fout}</Mededeling>}
          {sukses && <Mededeling tipe="sukses">{sukses}</Mededeling>}

          <form onSubmit={modus === 'teken-in' ? hanteerInteken : hanteerRegistrasie} noValidate>
            {modus === 'registreer' && (
              <>
                <Veld
                  id="naam" etiket="Naam" verpligtend
                  waarde={naam} opVerandering={setNaam}
                  fout={veldfoute.naam}
                  autoComplete="given-name"
                />
                <Veld
                  id="van" etiket="Van" verpligtend
                  waarde={van} opVerandering={setVan}
                  fout={veldfoute.van}
                  autoComplete="family-name"
                />
              </>
            )}

            <Veld
              id="epos" etiket="E-posadres" tipe="email" verpligtend
              waarde={epos} opVerandering={setEpos}
              fout={veldfoute.epos}
              autoComplete="email"
            />

            <Veld
              id="wagwoord" etiket="Wagwoord" verpligtend
              tipe={toonWagwoord ? 'text' : 'password'}
              waarde={wagwoord} opVerandering={setWagwoord}
              fout={veldfoute.wagwoord}
              autoComplete={modus === 'teken-in' ? 'current-password' : 'new-password'}
            />

            {modus === 'registreer' && <WagwoordSterkte wagwoord={wagwoord} />}

            <label className="landing__merker">
              <input
                type="checkbox"
                checked={toonWagwoord}
                onChange={(e) => setToonWagwoord(e.target.checked)}
              />
              Wys wagwoord
            </label>

            {modus === 'registreer' && (
              <>
                <Veld
                  id="kontak" etiket="Kontaknommer"
                  waarde={kontak} opVerandering={setKontak}
                  autoComplete="tel"
                />
                <Veld
                  id="geboorte" etiket="Geboortedatum" tipe="date"
                  waarde={geboortedatum} opVerandering={setGeboortedatum}
                  autoComplete="bday"
                />
              </>
            )}

            {modus === 'teken-in' && (
              <div className="landing__tussen">
                <label className="landing__merker">
                  <input
                    type="checkbox"
                    checked={onthouMy}
                    onChange={(e) => setOnthouMy(e.target.checked)}
                  />
                  Bly ingeteken
                </label>
                <Knoppie
                  variant="stil"
                  onClick={() => alert('Wagwoord-herstel kom later.')}
                >
                  Wagwoord vergeet?
                </Knoppie>
              </div>
            )}

            <Knoppie tipe="submit" volWydte besig={besig}>
              {modus === 'teken-in' ? 'Teken in' : 'Skep rekening'}
            </Knoppie>
          </form>

          <div className="landing__skeiding">
            <span>of</span>
          </div>

          <div className="landing__sosiaal">
            {/*
              'n Gewone skakel, nie 'n fetch nie. Die OAuth-vloei
              verlaat die bladsy en kom terug by die frontend.
              In ontwikkeling loop die backend op poort 3000.
            */}
            <a
              className="knoppie knoppie-sekondere knoppie-vol knoppie-met-teken"
              href="/api/auth/google"
            >
              <img src="/google.svg" alt="" width="18" height="18" />
              Gaan voort met Google
            </a>
            <a
              className="knoppie knoppie-sekondere knoppie-vol knoppie-met-teken"
              href="/api/auth/meta"
            >
              <img src="/meta.svg" alt="" width="18" height="18" />
              Gaan voort met Meta
            </a>
          </div>


        </div>
      </section>
    </div>
  );
}
