const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Rutas
const conciliacionRoutes = require('./routes/conciliacionRoutes');

// Crear aplicación Express
const app = express();

// Configuración de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Middleware para parsear JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Servir archivos estáticos (HTML/CSS/JS del frontend)
app.use(express.static('public'));

// Rutas de API
app.use('/api/conciliacion', conciliacionRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Ruta raíz (servir el app principal integrado)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'alenstec_app.html'));
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Error de validación
  if (err.status === 400 && err.array) {
    return res.status(400).json({
      exitoso: false,
      mensaje: 'Errores de validación',
      errores: err.array()
    });
  }

  // Error de archivo no encontrado (multer)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      exitoso: false,
      mensaje: 'Archivo demasiado grande. Máximo 10MB'
    });
  }

  // Error genérico
  res.status(err.status || 500).json({
    exitoso: false,
    mensaje: err.message || 'Error interno del servidor'
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✓ Servidor de Conciliación iniciado en puerto ${PORT}`);
  console.log(`✓ Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✓ API disponible en http://localhost:${PORT}/api`);
});

module.exports = app;
