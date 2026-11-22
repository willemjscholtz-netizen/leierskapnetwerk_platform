// reCAPTCHA v3 - onsigbaar, gee 'n telling terug tussen 0 en 1.
// Die token kom uit die blaaier, maar die VERIFIKASIE gebeur hier op
// die bediener. Dis die deel wat werklik werk; 'n blaaier-kontrole
// kan enigiemand met curl omseil.

const VERIFIKASIE_URL = 'https://www.google.com/recaptcha/api/siteverify';

// Google se aanbeveling: onder 0.5 is waarskynlik 'n bot. Ons weier
// alles onder hierdie telling.
const MIN_TELLING = 0.5;

// Hoe lank wag ons vir Google voordat ons tou opgooi
const TIMEOUT_MS = 5000;

/**
 * Verifieer 'n reCAPTCHA-token by Google.
 *
 * @param {string} token   Die token uit die blaaier
 * @param {string} ip      Die versoek se IP-adres (opsioneel, maar help Google)
 * @returns {Promise<{ok: boolean, telling: number|null, rede: string|null}>}
 */
async function verifieerRecaptcha(token, ip = null) {
  const secret = process.env.RECAPTCHA_SECRET;

  if (!secret) {
    // In ontwikkeling sonder sleutels: laat deur, maar waarsku hard.
    // In produksie moet dit 'n fout wees, nie 'n stille deurgang nie.
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, telling: null, rede: 'reCAPTCHA is nie opgestel nie' };
    }
    console.warn('WAARSKUWING: RECAPTCHA_SECRET ontbreek - captcha word oorgeslaan');
    return { ok: true, telling: null, rede: null };
  }

  if (!token || typeof token !== 'string') {
    return { ok: false, telling: null, rede: 'Geen captcha-token ontvang nie' };
  }

  const liggaam = new URLSearchParams({ secret, response: token });
  if (ip) liggaam.append('remoteip', ip);

  try {
    const res = await fetch(VERIFIKASIE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: liggaam,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const data = await res.json();

    // Google gee 'n lys foute terug wanneer dit misluk
    if (!data.success) {
      const redes = (data['error-codes'] ?? []).join(', ') || 'onbekend';
      return { ok: false, telling: null, rede: `Captcha het misluk: ${redes}` };
    }

    const telling = typeof data.score === 'number' ? data.score : null;

    // 'n Telling onder die drempel beteken Google dink dis 'n bot
    if (telling !== null && telling < MIN_TELLING) {
      return {
        ok: false,
        telling,
        rede: `Verdagte aktiwiteit (telling ${telling.toFixed(2)})`,
      };
    }

    // action is die naam wat die blaaier saamgestuur het - ons toets dit
    // later in die roete self, want dit verskil per vorm.
    return { ok: true, telling, rede: null, action: data.action ?? null };
  } catch (err) {
    // Netwerkfout, timeout, of Google wat nie antwoord nie.
    // Ons WEIER nie op 'n netwerkfout nie - anders lê die platform plat
    // as Google 'n slegte dag het. Ons laat deur, maar teken dit aan.
    console.error('reCAPTCHA-verifikasie het gefaal:', err.message);
    return { ok: true, telling: null, rede: null };
  }
}

module.exports = { verifieerRecaptcha, MIN_TELLING, VERIFIKASIE_URL };
