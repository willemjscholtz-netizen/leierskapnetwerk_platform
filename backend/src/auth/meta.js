// Facebook-aanmelding (Facebook Login, OAuth 2.0).
//
// Meta se Graph API het 'n weergawe-nommer in elke URL. Ons
// pen dit vas op een plek, sodat 'n opgradering een reël is.
const GRAAF_WEERGAWE = 'v19.0';
const GRAAF_BASIS = `https://graph.facebook.com/${GRAAF_WEERGAWE}`;

const DIALOOG_EINDPUNT = `https://www.facebook.com/${GRAAF_WEERGAWE}/dialog/oauth`;

// Net die twee wat ons nodig het. Albei is "standaard toegang",
// wat beteken die app hoef NIE deur Meta se verifikasie te gaan
// nie - anders as Google se "sensitiewe" toestemmings.
const SKOOP = ['email', 'public_profile'];

function leesOpstelling() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri =
    process.env.META_REDIRECT_URI ??
    `${process.env.PUBLIC_URL ?? 'http://localhost:3000'}/api/auth/meta/callback`;

  if (!appId || !appSecret) {
    throw new Error('META_APP_ID en META_APP_SECRET ontbreek in .env');
  }

  return { appId, appSecret, redirectUri };
}

/**
 * Die adres waarheen ons die gebruiker stuur.
 */
function skepToestemmingsUrl(state) {
  const { appId, redirectUri } = leesOpstelling();

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SKOOP.join(','),   // Meta gebruik kommas, nie spasies
    state,
  });

  return `${DIALOOG_EINDPUNT}?${params.toString()}`;
}

/**
 * Ruil die kode om vir 'n toegangstoken, en kry dan die profiel.
 */
async function ruilKodeOm(code) {
  const { appId, appSecret, redirectUri } = leesOpstelling();

  // --- Stap 1: kode -> token ---------------------------------
  const tokenParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,   // in die liggaam, nie in die URL
    redirect_uri: redirectUri,
    code,
  });

  const tokenRes = await fetch(`${GRAAF_BASIS}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams,
    signal: AbortSignal.timeout(10000),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    const fout = tokenData.error ?? {};
    throw new Error(
      `Meta het die kode geweier: ${fout.message ?? 'onbekende fout'}`
    );
  }

  // --- Stap 2: token -> profiel ------------------------------
  // Ons vra net die velde wat ons nodig het. Meta gee nie die
  // e-posadres verniet nie - dit moet uitdruklik gevra word.
  const profielParams = new URLSearchParams({
    fields: 'id,first_name,last_name,email',
    access_token: tokenData.access_token,
  });

  const profielRes = await fetch(`${GRAAF_BASIS}/me?${profielParams}`, {
    signal: AbortSignal.timeout(10000),
  });

  const profiel = await profielRes.json();

  if (!profielRes.ok || profiel.error) {
    throw new Error(
      `Kon nie die profiel by Meta kry nie: ${profiel.error?.message ?? 'onbekende fout'}`
    );
  }

  // --- Die e-posadres wat dalk ontbreek ----------------------
  //
  // Dit is Meta se groot verskil van Google. 'n Rekening wat
  // met 'n selfoonnommer geskep is en nooit 'n e-pos bevestig
  // het nie, stuur geen e-pos terug nie. Sonder 'n e-posadres
  // kan ons nie 'n rekening skep nie.
  if (!profiel.email) {
    const fout = new Error(
      'Meta het geen e-posadres teruggegee nie. Dit gebeur wanneer ' +
      'die Facebook-rekening met \u0027n selfoonnommer geskep is en ' +
      'nog nooit \u0027n e-posadres bevestig het nie.'
    );
    fout.kode = 'GEEN_EPOS';
    throw fout;
  }

  return {
    epos: String(profiel.email).toLowerCase(),
    // Meta stuur net 'n e-pos as dit op die rekening is en
    // bevestig is. Ons weet nie of dit bevestig is nie - maar
    // 'n e-pos wat Meta het, is 'n e-pos wat hulle aanvaar.
    eposBevestig: true,
    voornaam: profiel.first_name ?? null,
    van: profiel.last_name ?? null,
    metaId: profiel.id ?? null,
  };
}

module.exports = { skepToestemmingsUrl, ruilKodeOm, GRAAF_WEERGAWE };
