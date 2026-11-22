const crypto = require('crypto');
const pool = require('../db/pool');

const GELDIG_URE = 24;

function nuweToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Skep 'n bevestigingstoken vir 'n gebruiker.
 * Ou ongebruikte tokens vir dieselfde doel word eerste verwyder,
 * sodat net die nuutste skakel werk.
 */
async function skepBevestigingstoken(userId) {
  const token = nuweToken();
  const expiresAt = new Date(Date.now() + GELDIG_URE * 3600 * 1000);

  await pool.query(
    "delete from public.email_tokens where user_id = $1 and doel = 'bevestiging' and gebruik_op is null",
    [userId]
  );

  await pool.query(
    `insert into public.email_tokens (user_id, token_hash, doel, expires_at)
     values ($1, $2, 'bevestiging', $3)`,
    [userId, hashToken(token), expiresAt]
  );

  return token;
}

/**
 * Wissel 'n token in. Gee die user_id terug, of null as dit
 * ongeldig, reeds gebruik, of verval het.
 */
async function wisselBevestigingstoken(token) {
  if (!token) return null;

  const result = await pool.query(
    `select id, user_id from public.email_tokens
      where token_hash = $1
        and doel = 'bevestiging'
        and gebruik_op is null
        and expires_at > now()`,
    [hashToken(token)]
  );

  if (result.rows.length === 0) return null;

  const ry = result.rows[0];

  // Merk dit as gebruik - 'n skakel werk net een keer
  await pool.query(
    'update public.email_tokens set gebruik_op = now() where id = $1',
    [ry.id]
  );

  return ry.user_id;
}

module.exports = {
  GELDIG_URE,
  skepBevestigingstoken,
  wisselBevestigingstoken,
};
