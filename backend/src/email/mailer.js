const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: process.env.MAIL_SECURE === 'true', // true vir 465, false vir 587
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
});

const AFKOMS = `"${process.env.MAIL_NAAM ?? 'PLATFORM'}" <${process.env.MAIL_USER}>`;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

/**
 * Stuur die bevestigings-e-pos met 'n skakel.
 */
async function stuurBevestiging(email, naam, token) {
  const basis = process.env.PUBLIC_URL ?? 'http://localhost:3000';
  const skakel = `${basis}/api/auth/bevestig?token=${encodeURIComponent(token)}`;

  const teks = [
    `Hallo ${naam},`,
    '',
    'Dankie dat jy by die Leierskapnetwerk Platform aangesluit het.',
    'Klik op die skakel hieronder om jou e-posadres te bevestig:',
    '',
    skakel,
    '',
    'Die skakel is 24 uur geldig. As jy nie hierdie rekening geskep het nie,',
    'kan jy hierdie e-pos ignoreer.',
    '',
    'Groete,',
    'Die Leierskapnetwerk Platform',
  ].join('\n');

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.5">
      <h2 style="margin-bottom: 0.5rem">Bevestig jou e-posadres</h2>
      <p>Hallo ${escapeHtml(naam)},</p>
      <p>Dankie dat jy by die Leierskapnetwerk Platform aangesluit het.
         Klik op die knoppie hieronder om jou e-posadres te bevestig:</p>
      <p style="margin: 1.5rem 0">
        <a href="${skakel}"
           style="background:#2563eb;color:white;padding:0.75rem 1.25rem;
                  border-radius:6px;text-decoration:none;display:inline-block">
          Bevestig my e-pos
        </a>
      </p>
      <p style="color:#6b7280;font-size:0.875rem">
        Die skakel is 24 uur geldig. As jy nie hierdie rekening geskep het nie,
        kan jy hierdie e-pos ignoreer.
      </p>
    </div>
  `;

  return transporter.sendMail({
    from: AFKOMS,
    to: email,
    subject: 'Bevestig jou e-posadres',
    text: teks,
    html,
  });
}

/**
 * Toets of die SMTP-opstelling werk, sonder om 'n e-pos te stuur.
 */
async function toetsVerbinding() {
  return transporter.verify();
}

module.exports = { transporter, stuurBevestiging, toetsVerbinding, AFKOMS };
