const express = require('express');
const cors = require('cors');
require('dotenv').config();
const sequelize = require('./config/database');

// Import models
const WorkOrder = require('./models/WorkOrder');
const Quote = require('./models/Quote');
const MaterialCost = require('./models/MaterialCost');
const LaborCost = require('./models/LaborCost');
const Supplier = require('./models/Supplier');

// Import routes
const workOrderRoutes = require('./routes/workOrders');
const quoteRoutes = require('./routes/quotes');
const costRoutes = require('./routes/costs');
const supplierRoutes = require('./routes/suppliers');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/costs', costRoutes);
app.use('/api/suppliers', supplierRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

// Sync database and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    
    await sequelize.sync({ alter: true });
    console.log('✓ Database models synced');
    
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ API endpoints available at http://localhost:${PORT}/api/*`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
