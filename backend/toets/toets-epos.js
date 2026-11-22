require('dotenv').config();
const { toetsVerbinding, AFKOMS } = require('./src/email/mailer');

(async () => {
  console.log('Opstelling:');
  console.log('  Host:  ', process.env.MAIL_HOST ?? '(ontbreek)');
  console.log('  Poort: ', process.env.MAIL_PORT ?? '(ontbreek)');
  console.log('  SSL:   ', process.env.MAIL_SECURE ?? '(ontbreek)');
  console.log('  Gebruiker:', process.env.MAIL_USER ?? '(ontbreek)');
  console.log('  Wagwoord:', process.env.MAIL_PASSWORD ? 'gelaai' : 'ONTBREEK');
  console.log('  Afkoms: ', AFKOMS);
  console.log();

  const t0 = Date.now();
  try {
    await toetsVerbinding();
    console.log('OK in', Date.now() - t0, 'ms - die bediener aanvaar ons geloofsbriewe');
  } catch (err) {
    console.log('MISLUK in', Date.now() - t0, 'ms');
    console.log(err.code || '(geen kode)', '-', err.message);
    process.exitCode = 1;
  }
})();
