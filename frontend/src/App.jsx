import { useState, useEffect, useCallback } from 'react';
import Landing from './pages/Landing';
import VoltooiProfiel from './pages/VoltooiProfiel';
import Tuisblad from './pages/Tuisblad';
import Profiel from './pages/Profiel';
import { api } from './lib/api';

// Watter skerm is oop. Dit is genoeg vir 'n app van hierdie
// grootte - 'n vol router is eers nodig wanneer daar regte
// bladsy-adresse moet wees.
const SKERM = {
  TUIS: 'tuis',
  PROFIEL: 'profiel',
};

export default function App() {
  const [gebruiker, setGebruiker] = useState(null);
  const [volledigheid, setVolledigheid] = useState(null);
  const [skerm, setSkerm] = useState(SKERM.TUIS);
  const [laai, setLaai] = useState(true);

  /**
   * Laai die ingetekende gebruiker en kyk of die profiel volledig is.
   *
   * Dit gebeur by elke inteken - met 'n e-posadres, met Google of
   * met Meta. 'n Nuwe rekening het byna altyd gate, want die
   * sosiale aanmeldings gee net 'n naam en 'n e-pos.
   */
  const gaanNa = useCallback(async () => {
    try {
      const ek = await api.ek();
      setGebruiker(ek.user);
      setSkerm(SKERM.TUIS);

      const v = await api.volledigheid();
      setVolledigheid(v);
    } catch {
      setGebruiker(null);
      setVolledigheid(null);
    }
  }, []);

  useEffect(() => {
    api.ek()
      .then(async (ek) => {
        setGebruiker(ek.user);
        try {
          setVolledigheid(await api.volledigheid());
        } catch {
          setVolledigheid(null);
        }
      })
      .catch(() => setGebruiker(null))
      .finally(() => setLaai(false));
  }, []);

  async function tekenUit() {
    try { await api.tekenUit(); } catch { /* maak nie saak nie */ }
    setGebruiker(null);
    setVolledigheid(null);
    setSkerm(SKERM.TUIS);
  }

  if (laai) {
    return <p style={{ padding: 'var(--ruimte-7)' }}>Laai…</p>;
  }

  // --- Nie ingeteken nie ---------------------------------------
  if (!gebruiker) {
    return <Landing onIngeteken={gaanNa} />;
  }

  // --- Ingeteken, maar die profiel is onvolledig ---------------
  if (volledigheid && !volledigheid.volledig) {
    return (
      <VoltooiProfiel
        gebruiker={gebruiker}
        velde={volledigheid.velde}
        opVoltooi={gaanNa}
      />
    );
  }

  // --- Die profielskerm ----------------------------------------
  if (skerm === SKERM.PROFIEL) {
    return (
      <Profiel
        gebruiker={gebruiker}
        opTuis={() => setSkerm(SKERM.TUIS)}
        opUitteken={tekenUit}
      />
    );
  }

  // --- Alles reg -----------------------------------------------
  return (
    <Tuisblad
      gebruiker={gebruiker}
      opProfiel={() => setSkerm(SKERM.PROFIEL)}
      opUitteken={tekenUit}
    />
  );
}
