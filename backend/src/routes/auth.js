const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { signAccessToken, signRefreshToken, verificarJWT } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ exitoso: false, mensaje: 'email y password requeridos' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !user.activo) {
      return res.status(401).json({ exitoso: false, mensaje: 'Credenciales inválidas' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ exitoso: false, mensaje: 'Credenciales inválidas' });
    }

    return res.json({
      exitoso: true,
      accessToken: signAccessToken(user),
      refreshToken: signRefreshToken(user),
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    });
  } catch (err) {
    return res.status(500).json({ exitoso: false, mensaje: err.message });
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
