const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { sequelize } = require('./models');
const { assertJwtSecret, verificarJWT } = require('./middleware/auth');

assertJwtSecret();

const authRoutes = require('./routes/auth');
const workOrderRoutes = require('./routes/workOrders');
const quoteRoutes = require('./routes/quotes');
const costRoutes = require('./routes/costs');
const supplierRoutes = require('./routes/suppliers');
const conciliacionRoutes = require('./routes/conciliacionRoutes');

const app = express();

// CSP tuned for the single-file SPA (alenstec_app.html): inline <script>/<style>
// blocks, jsPDF + html2canvas from cdnjs, DM Sans + DM Mono from Google Fonts.
// LAN-only on-prem deployment — we keep defaultSrc tight and widen only where
// the SPA actually needs it.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: null,
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public: auth only
app.use('/api/auth', authRoutes);

// Everything else requires a valid JWT
app.use('/api', verificarJWT);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/costs', costRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/conciliacion', conciliacionRoutes);

// Serve the app SPA at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'alenstec_app.html'));
});

app.use((err, req, res, _next) => {
  console.error('Error:', err);
  if (err.status === 400 && err.array) {
    return res.status(400).json({ exitoso: false, mensaje: 'Errores de validación', errores: err.array() });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ exitoso: false, mensaje: 'Archivo demasiado grande. Máximo 10MB' });
  }
  res.status(err.status || 500).json({ exitoso: false, mensaje: err.message || 'Error interno del servidor' });
});

const PORT = parseInt(process.env.PORT, 10) || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
