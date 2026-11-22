require('dotenv').config();
const tls = require('tls');

const HOST = process.env.MAIL_HOST;
const USER = process.env.MAIL_USER;
const PASS = process.env.MAIL_PASSWORD;

// Probeer IMAP met albei gebruikersnaam-vorms
const vorms = USER.includes('@') ? [USER, USER.split('@')[0]] : [USER, USER + '@leierskapnetwerk.net'];

console.log('Host:', HOST, '| Poort: 993 (IMAP)');
console.log('Wagwoord gelaaie lengte:', PASS ? PASS.length : 0);
console.log();

function probeer(gebruiker) {
  return new Promise((resolve) => {
    console.log('--- Probeer gebruikersnaam: "' + gebruiker + '" ---');
    const socket = tls.connect(
      { host: HOST, port: 993, rejectUnauthorized: false },
      () => {}
    );
    socket.setTimeout(15000);

    let buffer = '';
    let stap = 0;

    socket.on('data', (data) => {
      buffer += data.toString();
      if (!buffer.includes('\r\n')) return;
      const antwoord = buffer.trim();
      buffer = '';

      console.log('Bediener:', antwoord.split('\n').join('\n          '));

      if (stap === 0) {
        stap++;
        console.log('Ons:     a1 LOGIN <gebruikersnaam> <wagwoord>');
        socket.write(`a1 LOGIN ${gebruiker} ${PASS}\r\n`);
      } else if (stap === 1) {
        if (antwoord.startsWith('a1 OK')) {
          console.log('  *** IMAP-AANMELDING GESLAAG ***\n');
          socket.write('a2 LOGOUT\r\n');
          socket.end();
          resolve(true);
        } else {
          console.log('  *** IMAP-AANMELDING GEWEIER ***\n');
          socket.write('a2 LOGOUT\r\n');
          socket.end();
          resolve(false);
        }
      } else {
        socket.end();
        resolve(false);
      }
    });

    socket.on('timeout', () => {
      console.log('  TYDSVERLOOP\n');
      socket.destroy();
      resolve(false);
    });

    socket.on('error', (err) => {
      console.log('  FOUT:', err.code, '-', err.message, '\n');
      resolve(false);
    });
  });
}

(async () => {
  for (const v of vorms) {
    await probeer(v);
  }
  console.log('Klaar.');
  process.exit(0);
})();
