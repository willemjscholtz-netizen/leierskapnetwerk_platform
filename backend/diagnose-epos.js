require('dotenv').config();
const tls = require('tls');

const HOST = process.env.MAIL_HOST;
const PORT = Number(process.env.MAIL_PORT);
const USER = process.env.MAIL_USER;
const PASS = process.env.MAIL_PASSWORD;

console.log('--- Opstelling ---');
console.log('  Host:      ', HOST ?? '(ontbreek)');
console.log('  Poort:     ', PORT || '(ontbreek)');
console.log('  Gebruiker: ', USER ?? '(ontbreek)');
console.log('  Wagwoord:  ', PASS ? `gelaai (${PASS.length} karakters)` : 'ONTBREEK');
console.log();

if (!HOST || !PORT || !USER || !PASS) {
  console.log('Een of meer MAIL_*-lyne ontbreek in .env. Stop hier.');
  process.exit(1);
}

// 'n Onbewerkte SMTP-kletsery. Ons lees elke antwoord en wys dit.
const socket = tls.connect({ host: HOST, port: PORT, rejectUnauthorized: false }, () => {
  console.log('--- Verbinding ---');
  console.log('TLS aanvaar?', socket.authorized ? 'ja, sertifikaat geldig' : 'nee, maar ons gaan voort');
});

socket.setTimeout(15000);

let stap = 0;
let buffer = '';

socket.on('data', (data) => {
  buffer += data.toString();
  // SMTP-antwoorde eindig met "250 " (spasie na die kode) of 'n kode en strepie
  if (!/^\d{3} /m.test(buffer)) return;

  const antwoord = buffer.trim();
  console.log('Bediener:', antwoord.split('\n').join('\n          '));
  buffer = '';

  // Volg die SMTP-gesprek
  if (stap === 0) {
    stap++;
    console.log('Ons:     EHLO diagnose.local');
    socket.write('EHLO diagnose.local\r\n');
  } else if (stap === 1) {
    stap++;
    console.log('Ons:     AUTH LOGIN');
    socket.write('AUTH LOGIN\r\n');
  } else if (stap === 2) {
    stap++;
    console.log('Ons:     <gebruikersnaam in base64>');
    socket.write(Buffer.from(USER).toString('base64') + '\r\n');
  } else if (stap === 3) {
    stap++;
    console.log('Ons:     <wagwoord in base64>');
    socket.write(Buffer.from(PASS).toString('base64') + '\r\n');
  } else if (stap === 4) {
    if (antwoord.startsWith('235')) {
      console.log('\n*** AANMELDING GESLAAG ***');
      console.log('Die geloofsbriewe is reg. Die probleem le in Nodemailer se opstelling.');
    } else {
      console.log('\n*** AANMELDING GEWEIER ***');
      console.log('Kode:', antwoord.slice(0, 3));
      console.log();
      console.log('Wat die kode beteken:');
      console.log('  535 = gebruikersnaam of wagwoord verkeerd');
      console.log('  534 = die bediener wil nie AUTH LOGIN gebruik nie');
      console.log('  454 = tydelike probleem, probeer later weer');
      console.log();
      console.log('Probeer hierdie in .env, een op \u0027n slag:');
      console.log('  1. MAIL_USER=' + USER + '          (soos dit nou is)');
      console.log('  2. MAIL_USER=' + USER.split('@')[0] + '              (net die deel voor die @)');
    }
    socket.write('QUIT\r\n');
    socket.end();
  }
});

socket.on('timeout', () => {
  console.log('\nTYDSVERLOOP - geen antwoord binne 15 sekondes.');
  socket.destroy();
});

socket.on('error', (err) => {
  console.log('\nVERBINDINGSF Gaut:', err.code, '-', err.message);
  console.log('Dit is \u0027n netwerk- of firewallprobleem, nie \u0027n wagwoordprobleem nie.');
});

socket.on('close', () => process.exit(0));
