/**
 * Vra die blaaier om die gebruiker se ligging.
 *
 * Dit GEE ALTYD IETS TERUG - die belofte misluk nooit. Rede:
 * ligging is 'n bykomstigheid, nie 'n voorwaarde nie. As iemand
 * weier, of as die blaaier nie ondersteun nie, moet hulle steeds
 * kan inteken.
 *
 * Die tydsverloop is 8 sekondes. Dit is genoeg vir 'n GPS wat
 * nog koud is, sonder om die mens te laat wag.
 */
export function kryLigging({ tydsverloop = 8000 } = {}) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return resolve(null);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          locationLat: pos.coords.latitude,
          locationLng: pos.coords.longitude,
          // Die radius waarbinne die toestel dink dit is, in
          // meters, met 95% vertroue. Dit is die getal wat sê of
          // die ligging iets werd is.
          locationAccuracy: pos.coords.accuracy ?? null,
        }),
      () => resolve(null),   // geweier of misluk - ons gaan voort
      {
        timeout: tydsverloop,
        enableHighAccuracy: true,   // vinniger, en presies genoeg
        maximumAge: 0,   // 'n 5-minute-oue waarde is reg
      }
    );
  });
}
