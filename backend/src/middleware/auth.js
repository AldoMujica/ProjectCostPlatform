const jwt = require('jsonwebtoken');

/**
 * Middleware para verificar JWT y en inyectar un usuario local si no hay token
 */
const verificarJWT = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      // En este entorno de integración sin login separado, permitimos un usuario local por defecto.
      req.user = { id: 1, rol: 'admin' };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      exitoso: false,
      mensaje: 'Token inválido o expirado'
    });
  }
};

/**
 * Verificar que el usuario tenga un rol específico
 */
const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        exitoso: false,
        mensaje: 'Usuario no autenticado'
      });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        exitoso: false,
        mensaje: `Acceso denegado. Roles permitidos: ${rolesPermitidos.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware para verificar si el usuario es supervisor
 * Si es supervisor, valida que solo vea sus empleados
 */
const filtrarPorSupervisor = (req, res, next) => {
  if (req.user.rol === 'supervisor') {
    req.supervisor_id = req.user.user_id;
  } else {
    req.supervisor_id = null; // null = sin filtro (admin/rh/jefe_area ven todo)
  }
  next();
};

module.exports = {
  verificarJWT,
  verificarRol,
  filtrarPorSupervisor
};
