// Een plek wat met die backend praat.
//
// Alle paaie is relatief (/api/...), want Vite stuur hulle in
// ontwikkeling na die backend en in produksie staan die twee
// op dieselfde werf. credentials: 'include' is nodig sodat die
// sessie-koekie saamgestuur word.

async function versoek(metode, pad, liggaam) {
  const opsies = {
    method: metode,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (liggaam !== undefined) opsies.body = JSON.stringify(liggaam);

  const res = await fetch(pad, opsies);

  let data = null;
  try { data = await res.json(); } catch { /* leë antwoord is reg */ }

  if (!res.ok) {
    const fout = new Error(data?.error ?? `Versoek het gefaal (${res.status})`);
    fout.status = res.status;
    fout.details = data?.details;
    throw fout;
  }

  return data;
}

export const api = {
  registreer: (data) => versoek('POST', '/api/auth/registreer', data),
  tekenIn: (data) => versoek('POST', '/api/auth/teken-in', data),
  tekenUit: () => versoek('POST', '/api/auth/teken-uit'),
  ek: () => versoek('GET', '/api/auth/ek'),
  profiel: () => versoek('GET', '/api/profiel'),
  profielBywerk: (data) => versoek('PATCH', '/api/profiel', data),
  volledigheid: () => versoek('GET', '/api/profiel/volledigheid'),
  stoorPrent: (data) => versoek('PUT', '/api/profiel/prent', { data }),
  verwyderPrent: () => versoek('DELETE', '/api/profiel/prent'),
};
