// Google-aanmelding (OAuth 2.0, authorization code flow).
//
// Waarom hierdie vloei en nie die eenvoudiger "blaaier kry 'n
// token"-manier nie: hierdie een laat die CLIENT SECRET op die
// bediener bly. Die blaaier sien net 'n kode wat een keer werk.
// Sonder dit vertrou ons iets wat van die blaaier af kom, en
// dan kan enigiemand 'n token namaak.

const AUTH_EINDPUNT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_EINDPUNT = 'https://oauth2.googleapis.com/token';
const USERINFO_EINDPUNT = 'https://www.googleapis.com/oauth2/v3/userinfo';

// Net die drie wat ons nodig het. Elke bykomende toestemming
// maak die toestemmingsskerm langer en die mens meer agterdogtig.
const SKOOP = ['openid', 'email', 'profile'];

function leesOpstelling() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.PUBLIC_URL ?? 'http://localhost:3000'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error(
      'GOOGLE_CLIENT_ID en GOOGLE_CLIENT_SECRET ontbreek in .env'
    );
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Die adres waarheen ons die gebruiker stuur.
 *
 * state: 'n ewekansige string wat ons in 'n koekie stoor en
 *        terugverwag. Dit beskerm teen CSRF - sonder dit kan
 *        iemand 'n kwaadwillige versoek namens 'n gebruiker stuur.
 */
function skepToestemmingsUrl(state) {
  const { clientId, redirectUri } = leesOpstelling();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SKOOP.join(' '),
    state,
    // Hiersonder kry die gebruiker elke keer weer die skerm.
    // Met 'consent' vra Google net die eerste keer.
    access_type: 'online',
    prompt: 'select_account',
  });

  return `${AUTH_EINDPUNT}?${params.toString()}`;
}

/**
 * Ruil die kode om vir 'n toegangstoken, en kry dan die
 * gebruiker se e-posadres en naam.
 */
async function ruilKodeOm(code) {
  const { clientId, clientSecret, redirectUri } = leesOpstelling();

  const liggaam = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch(TOKEN_EINDPUNT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: liggaam,
    signal: AbortSignal.timeout(10000),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.access_token) {
    const rede = tokenData.error_description ?? tokenData.error ?? 'onbekend';
    throw new Error(`Google het die kode geweier: ${rede}`);
  }

  const profielRes = await fetch(USERINFO_EINDPUNT, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
    signal: AbortSignal.timeout(10000),
  });

  const profiel = await profielRes.json();

  if (!profielRes.ok || !profiel.email) {
    throw new Error('Kon nie die e-posadres by Google kry nie');
  }

  return {
    epos: String(profiel.email).toLowerCase(),
    eposBevestig: Boolean(profiel.email_verified),
    voornaam: profiel.given_name ?? null,
    van: profiel.family_name ?? null,
    prent: profiel.picture ?? null,
    googleId: profiel.sub ?? null,
  };
}

module.exports = { skepToestemmingsUrl, ruilKodeOm };
