// reCAPTCHA v3 - onsigbaar. Die skrip word een keer gelaai en
// gee dan 'n token wanneer ons een vra.
//
// Die wag is belangrik: as iemand vinnig klik voordat die skrip
// gelaai het, gee execute 'n leë token en die backend antwoord
// met "browser-error". Ons wag dus tot grecaptcha bestaan.

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

let laaiBelofte = null;

function laaiSkrip() {
  if (laaiBelofte) return laaiBelofte;

  laaiBelofte = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Geen blaaier-omgewing nie'));
    }
    if (window.grecaptcha?.execute) return resolve(window.grecaptcha);

    const skrip = document.createElement('script');
    skrip.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    skrip.async = true;
    skrip.onload = () => {
      if (!window.grecaptcha?.execute) {
        return reject(new Error('Die captcha-skrip het gelaai maar grecaptcha ontbreek'));
      }
      window.grecaptcha.ready(() => resolve(window.grecaptcha));
    };
    skrip.onerror = () => reject(new Error('Kon nie die captcha-skrip laai nie'));
    document.head.appendChild(skrip);
  });

  return laaiBelofte;
}

export async function kryCaptchaToken(aksie) {
  if (!SITE_KEY) {
    throw new Error('VITE_RECAPTCHA_SITE_KEY ontbreek in .env');
  }
  const grecaptcha = await laaiSkrip();
  const token = await grecaptcha.execute(SITE_KEY, { action: aksie });
  if (!token) throw new Error('Google het geen captcha-token gegee nie');
  return token;
}
