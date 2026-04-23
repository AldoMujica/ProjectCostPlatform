const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { signAccessToken, signRefreshToken, verificarJWT } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

const router = express.Router();

router.post('/login', async (req, res) => {
  const emailRaw = req.body?.email;
  const ip = req.ip || req.socket?.remoteAddress || null;
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ exitoso: false, mensaje: 'email y password requeridos' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !user.activo) {
      await logAudit({
        accion: 'login_failed', entidad: 'auth', entidadId: email.toLowerCase(),
        descripcion: `Login fallido · ${user ? 'usuario inactivo' : 'usuario no existe'}`,
        ip,
      });
      return res.status(401).json({ exitoso: false, mensaje: 'Credenciales inválidas' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await logAudit({
        accion: 'login_failed', entidad: 'auth', entidadId: user.email,
        descripcion: 'Login fallido · contraseña incorrecta',
        user: { id: user.id, nombre: user.nombre, rol: user.rol }, ip,
      });
      return res.status(401).json({ exitoso: false, mensaje: 'Credenciales inválidas' });
    }

    await logAudit({
      accion: 'login', entidad: 'auth', entidadId: user.email,
      descripcion: `Inicio de sesión · ${user.nombre} (${user.rol})`,
      user: { id: user.id, nombre: user.nombre, rol: user.rol }, ip,
    });

    return res.json({
      exitoso: true,
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    });
  } catch (err) {
    await logAudit({
      accion: 'login_error', entidad: 'auth', entidadId: emailRaw || 'unknown',
      descripcion: `Error de login: ${err.message}`, ip,
    });
    return res.status(500).json({ exitoso: false, mensaje: err.message });
  }
});

router.post('/logout', verificarJWT, async (req, res) => {
  try {
    await logAudit({
      accion: 'logout', entidad: 'auth', entidadId: req.user.email || String(req.user.id),
      descripcion: `Cierre de sesión · ${req.user.nombre || req.user.id}`,
      user: req.user, ip: req.ip,
    });
    res.json({ exitoso: true });
  } catch (err) {
    res.status(500).json({ exitoso: false, mensaje: err.message });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ exitoso: false, mensaje: 'refreshToken requerido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ exitoso: false, mensaje: 'Refresh token inválido' });
    }
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ exitoso: false, mensaje: 'Tipo de token inesperado' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user || !user.activo) {
      return res.status(401).json({ exitoso: false, mensaje: 'Usuario no disponible' });
    }

    return res.json({
      exitoso: true,
      accessToken: signAccessToken(user),
    });
  } catch (err) {
    return res.status(500).json({ exitoso: false, mensaje: err.message });
  }
});

router.get('/me', verificarJWT, async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ['id', 'nombre', 'email', 'rol', 'activo'],
  });
  if (!user) return res.status(404).json({ exitoso: false, mensaje: 'Usuario no encontrado' });
  res.json({ exitoso: true, user });
});

module.exports = router;
