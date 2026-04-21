const jwt = require('jsonwebtoken');

const INVALID_DEFAULTS = new Set(['', 'tu_secret_key', 'change_me', 'secret']);

function assertJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || INVALID_DEFAULTS.has(s)) {
    throw new Error(
      'JWT_SECRET is unset or set to a default value. ' +
      'Refusing to boot — set a strong secret in environment before starting.'
    );
  }
  if (s.length < 32) {
    throw new Error(`JWT_SECRET too short (${s.length} chars). Minimum 32.`);
  }
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, rol: user.rol, nombre: user.nombre },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_TTL || '1h' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_TTL || '14d' }
  );
}

const verificarJWT = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ exitoso: false, mensaje: 'Token requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'refresh') {
      return res.status(401).json({ exitoso: false, mensaje: 'Token de refresh no aceptado aquí' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ exitoso: false, mensaje: 'Token inválido o expirado' });
  }
};

const verificarRol = (...rolesPermitidos) => {
  const allowed = Array.isArray(rolesPermitidos[0]) ? rolesPermitidos[0] : rolesPermitidos;
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ exitoso: false, mensaje: 'Usuario no autenticado' });
    }
    if (!allowed.includes(req.user.rol)) {
      return res.status(403).json({
        exitoso: false,
        mensaje: `Acceso denegado. Roles permitidos: ${allowed.join(', ')}`,
      });
    }
    next();
  };
};

// P1.7 per-record access filter extended from filtrarPorSupervisor
const filtrarPorSupervisor = (req, res, next) => {
  if (req.user && req.user.rol === 'supervisor') {
    req.supervisor_id = req.user.id;
  } else {
    req.supervisor_id = null;
  }
  next();
};

module.exports = {
  assertJwtSecret,
  signAccessToken,
  signRefreshToken,
  verificarJWT,
  verificarRol,
  filtrarPorSupervisor,
};
