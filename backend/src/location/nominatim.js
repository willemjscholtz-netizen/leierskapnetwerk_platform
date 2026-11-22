// ===============================================================
// NOMINATIM - reverse geocoding
// ===============================================================
//
// Stuur 'n koördinaat en kry 'n pleknaam terug.
//
// Ons volg Nominatim se gebruiksvoorwaardes:
//   - een versoek per sekonde (ons het 'n wag tussen versoeke)
//   - 'n User-Agent wat sê wie ons is
//   - geen massa-navrae nie
//
// Die diens is gratis. Ons vra dit NET wanneer die ligging
// werklik verander het - anders sou elke aanmelding 'n versoek
// wees, en dit is onnodige las op 'n gratis diens.

const BASIS = 'https://nominatim.openstreetmap.org/reverse';

// Nominatim vra 'n User-Agent met 'n kontakadres. Sonder dit
// mag hulle die versoeke blokkeer.
function userAgent() {
  const kontak = process.env.NOMINATIM_CONTACT;
  if (!kontak) {
    throw new Error(
      'NOMINATIM_CONTACT ontbreek in .env. Nominatim vra \u0027n ' +
      'kontakadres in die User-Agent.'
    );
  }
  return `LeierskapnetwerkPlatform/1.0 (${kontak})`;
}

// Ons hou die laaste versoek se tyd, sodat ons nie vinniger as
// een per sekonde vra nie. Dit is Nominatim se reël.
let laasteVersoek = 0;
const MIN_TUSSEN = 1100;   // 1.1 sekonde - effens oor 1 om seker te wees

async function wagVirBeurt() {
  const nou = Date.now();
  const gewag = nou - laasteVersoek;
  if (gewag < MIN_TUSSEN) {
    await new Promise((r) => setTimeout(r, MIN_TUSSEN - gewag));
  }
  laasteVersoek = Date.now();
}

/**
 * Kry 'n pleknaam vir 'n koördinaat.
 *
 * Gee null terug as dit misluk - 'n pleknaam is 'n bykomstigheid,
 * nie 'n voorwaarde nie. Die koördinate is die belangrike data.
 */
async function kryPleknaam(lat, lng) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return null;
  }

  try {
    await wagVirBeurt();

    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      zoom: '14',              // omtrent 'n buurt/woonbuurt
      'accept-language': 'af,en',
      addressdetails: '1',
    });

    const res = await fetch(`${BASIS}?${params}`, {
      headers: {
        'User-Agent': userAgent(),
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn('Nominatim het geantwoord met', res.status);
      return null;
    }

    const data = await res.json();
    if (!data || data.error) return null;

    // Ons wil 'n KORT naam hê, nie die volle adres nie.
    // "Willemstraat 12, Sunnyside, Pretoria, ..." is te veel.
    // Die dorp/stad plus die provinsie is wat 'n mens wil sien.
    const a = data.address ?? {};
    const dele = [
      a.city ?? a.town ?? a.village ?? a.suburb ?? a.municipality,
      a.state,
    ].filter(Boolean);

    if (dele.length) return dele.join(', ');
    if (data.display_name) {
      // Val terug op die eerste twee dele van die volle naam
      return data.display_name.split(',').slice(0, 2).join(',').trim();
    }
    return null;
  } catch (err) {
    console.warn('Nominatim-navra het gefaal:', err.message);
    return null;
  }
}

module.exports = { kryPleknaam };
