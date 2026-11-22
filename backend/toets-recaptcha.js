// Toets die captcha-hulplêer se gedrag
require('dotenv').config();
const { verifieerRecaptcha, MIN_TELLING } = require('./src/auth/recaptcha');

(async () => {
  console.log('Drempel-telling:', MIN_TELLING);
  console.log('Secret gelaai?', process.env.RECAPTCHA_SECRET ? 'ja' : 'NEE');
  console.log();

  console.log('--- Geen token gestuur ---');
  console.log(await verifieerRecaptcha(null));

  console.log('\n--- Leë token ---');
  console.log(await verifieerRecaptcha(''));

  console.log('\n--- Onsinnige token (gaan werklik na Google) ---');
  const uitslag = await verifieerRecaptcha('onsinnige-token-12345', '127.0.0.1');
  console.log(uitslag);
  console.log('\n(Ons verwag ok:false omdat Google die token nie ken nie.');
  console.log(' Dit bewys die verifikasie werklik by Google gebeur.)');
})();
