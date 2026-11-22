const crypto = require('crypto');
const pool = require('../db/pool');

// Hoe lank 'n sessie leef
const UREN_SONDER_ONTHOU = 24;
const DAE_MET_ONTHOU = 30;

const KOEKIE_NAAM = 'lnp_sessie';

function nuweToken() {
  // 32 grepe = 256 bis entropie. Dis nie raadbaar nie.
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  // SHA-256, nie bcrypt nie. Rede: hierdie word by ELKE versoek nagegaan,
  // en bcrypt se 276 ms sou die app ondraaglik maak. Die token is
  // 256 bis ewekansig - dit kan nie gerai word soos 'n wagwoord nie.
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function skepSessie(userId, onthouMy, req) {
  const token = nuweToken();
  const dae = onthouMy ? DAE_MET_ONTHOU : 0;
  const ure = onthouMy ? 0 : UREN_SONDER_ONTHOU;

  const expiresAt = new Date(Date.now() + (dae * 24 * 60 + ure * 60) * 60 * 1000);

  await pool.query(
    `insert into sessions (user_id, token_hash, expires_at, user_agent, ip_address)
     values ($1, $2, $3, $4, $5)`,
    [
      userId,
      hashToken(token),
      expiresAt,
      req?.get?.('user-agent') ?? null,
      req?.ip ?? null,
    ]
  );

  return { token, expiresAt, onthouMy: Boolean(onthouMy) };
}

async function vindSessie(token) {
  if (!token) return null;

  const result = await pool.query(
    `select s.id as sessie_id, s.expires_at,
            u.id, u.email, u.first_name, u.last_name, u.auth_provider,
            u.email_verified, u.profile_photo
       from sessions s
       join users u on u.id = s.user_id
      where s.token_hash = $1
        and s.expires_at > now()`,
    [hashToken(token)]
  );

  if (result.rows.length === 0) return null;

  const ry = result.rows[0];
  return {
    sessieId: ry.sessie_id,
    expiresAt: ry.expires_at,
    user: {
      id: ry.id,
      email: ry.email,
      first_name: ry.first_name,
      last_name: ry.last_name,
      auth_provider: ry.auth_provider,
      email_verified: ry.email_verified,
      profile_photo: ry.profile_photo,
    },
  };
}

async function verwyderSessie(token) {
  if (!token) return;
  await pool.query('delete from sessions where token_hash = $1', [hashToken(token)]);
}

async function verwyderAlleSessies(userId) {
  await pool.query('delete from sessions where user_id = $1', [userId]);
}

// --- Koekie-bestuur -------------------------------------------

function stelKoekie(res, sessie) {
  const opsies = {
    httpOnly: true,              // JavaScript in die blaaier kan dit nie lees nie
    sameSite: 'lax',             // Blokkeer die meeste CSRF-aanvalle
    secure: process.env.NODE_ENV === 'production', // HTTPS in produksie
    path: '/',
  };

  if (sessie.onthouMy) {
    opsies.expires = sessie.expiresAt;   // Permanente koekie = 30 dae
  }
  // Sonder 'expires' is dit 'n sessie-koekie: dit verdwyn as die blaaier toegemaak word

  res.cookie(KOEKIE_NAAM, sessie.token, opsies);
}

function verwyderKoekie(res) {
  res.clearCookie(KOEKIE_NAAM, { path: '/' });
}

// --- Middleware -----------------------------------------------

async function laaiGebruiker(req, res, next) {
  try {
    const sessie = await vindSessie(req.cookies?.[KOEKIE_NAAM]);
    if (!sessie) {
      if (req.cookies?.[KOEKIE_NAAM]) verwyderKoekie(res);
      return next();
    }
    req.sessie = sessie;
    req.gebruiker = sessie.user;
    next();
  } catch (err) {
    next(err);
  }
}

function vereisInteken(req, res, next) {
  if (!req.gebruiker) {
    return res.status(401).json({ error: 'Jy moet ingeteken wees' });
  }
  next();
}

module.exports = {
  KOEKIE_NAAM,
  UREN_SONDER_ONTHOU,
  DAE_MET_ONTHOU,
  nuweToken,
  hashToken,
  skepSessie,
  vindSessie,
  verwyderSessie,
  verwyderAlleSessies,
  stelKoekie,
  verwyderKoekie,
  laaiGebruiker,
  vereisInteken,
};
