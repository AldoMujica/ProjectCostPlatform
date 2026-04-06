# Alenstec Backend Setup Guide

## ✓ What's Been Created

Your project now has a complete Node.js + Express backend with PostgreSQL database integration:

### Backend Folder Structure
```
backend/
├── config/
│   └── database.js          # Sequelize database configuration
├── models/
│   ├── WorkOrder.js         # Work orders table schema
│   ├── Quote.js             # Quotes table schema
│   ├── MaterialCost.js       # Material costs table schema
│   ├── LaborCost.js          # Labor costs table schema
│   └── Supplier.js           # Suppliers table schema
├── routes/
│   ├── workOrders.js        # Work orders REST API
│   ├── quotes.js            # Quotes REST API
│   ├── costs.js             # Costs (material & labor) REST API
│   └── suppliers.js         # Suppliers REST API
├── server.js                # Main Express server
├── seed.js                  # Database seeding script
├── package.json             # Node.js dependencies
├── .env                     # Environment variables
├── .gitignore               # Git ignore rules
└── README.md                # API documentation
```

---

## 🚀 Getting Started

### Step 1: Install PostgreSQL
- Download from: https://www.postgresql.org/download/
- Install and remember your password for the `postgres` user

### Step 2: Create Database
Open PostgreSQL Command Line or pgAdmin and run:
```sql
CREATE DATABASE alenstec_db;
```

### Step 3: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 4: Configure Environment (Optional)
Edit `.env` if your PostgreSQL credentials differ:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alenstec_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
PORT=3000
```

### Step 5: Start the Backend Server
```bash
npm start
```

You should see:
```
✓ Database connection established
✓ Database models synced
✓ Server running on http://localhost:3000
✓ API endpoints available at http://localhost:3000/api/*
```

### Step 6: (Optional) Seed Sample Data
In another terminal, from the backend folder:
```bash
npm run seed
```

This loads sample data for:
- 6 work orders
- 4 quotations  
- 3 material costs
- 3 labor costs
- 3 suppliers

---

## 📡 API Endpoints

### Work Orders
```
GET    /api/work-orders                 List all work orders
GET    /api/work-orders/:id             Get single work order
POST   /api/work-orders                 Create work order
PUT    /api/work-orders/:id             Update work order
DELETE /api/work-orders/:id             Delete work order
GET    /api/work-orders/kpi/summary     Get KPI summary
```

### Quotes
```
GET    /api/quotes                      List all quotes
GET    /api/quotes/:id                  Get single quote
POST   /api/quotes                      Create quote
PUT    /api/quotes/:id                  Update quote
GET    /api/quotes/kpi/open-count       Get open quotes count
```

### Costs
```
GET    /api/costs/material              List material costs
GET    /api/costs/labor                 List labor costs
POST   /api/costs/material              Create material cost
POST   /api/costs/labor                 Create labor cost
GET    /api/costs/kpi/material-transit  Get material in transit summary
```

### Suppliers
```
GET    /api/suppliers                   List all suppliers
GET    /api/suppliers/:id               Get single supplier
POST   /api/suppliers                   Create supplier
PUT    /api/suppliers/:id               Update supplier
```

### Health Check
```
GET    /api/health                      API server status
```

---

## 🧪 Testing Endpoints

### Using curl
```bash
# Get all work orders
curl http://localhost:3000/api/work-orders

# Get health status
curl http://localhost:3000/api/health

# Create new work order
curl -X POST http://localhost:3000/api/work-orders \
  -H "Content-Type: application/json" \
  -d '{"otNumber":"OT-AL-2000","client":"Test Client","description":"Test Project","type":"Nuevo","quotedCost":5000}'
```

### Using VS Code REST Client Extension
Create a `test.http` file in the backend folder:
```http
### Get all work orders
GET http://localhost:3000/api/work-orders

### Get suppliers
GET http://localhost:3000/api/suppliers

### Get health
GET http://localhost:3000/api/health
```

---

## 🔌 Frontend Connection

The frontend (`alenstec_app.html`) is already configured to:
- Attempt connection to `http://localhost:3000/api`
- Display a console warning if backend is unavailable
- Fall back to static data if backend is not running

**Important:** You must start the backend before opening the app in some browsers due to CORS. The backend has CORS enabled for all origins.

---

## 🛠 Development

### Run with Auto-Reload
```bash
npm run dev
```
(Requires nodemon, already in devDependencies)

### Database Changes
- Models auto-sync on startup using `sequelize.sync({ alter: true })`
- No migrations needed for development
- Can be changed to `force: true` for fresh rebuild (destroys data)

---

## 📊 Database Schema Details

### WorkOrder
- UUID primary key
- Fields: otNumber, client, description, type, progress, status, quotedCost, actualCost, currency, dates

### Quote  
- UUID primary key
- Fields: quoteNumber, client, description, amount, currency, status, validUntil

### MaterialCost
- UUID primary key
- Fields: otNumber, materialDescription, quantity, unitCost, totalCost, currency, supplier, status, deliveryDate

### LaborCost
- UUID primary key
- Fields: otNumber, employeeName, role, hoursWorked, hourlyRate, totalCost, currency, date

### Supplier
- UUID primary key
- Fields: supplierName, description, categories (array), workOrders (array), status, contactEmail, contactPhone

---

## ⚠ Troubleshooting

### Backend won't start
- Verify PostgreSQL is running
- Check database name in `.env` exists
- Check port 3000 isn't in use: `netstat -ano | findstr :3000` (Windows)

### "Connection refused" from frontend
- Ensure backend is running on port 3000
- Verify CORS is not blocked
- Check browser console for exact error

### Database not syncing
- Delete database: `DROP DATABASE alenstec_db;`
- Recreate: `CREATE DATABASE alenstec_db;`
- Restart backend

---

## 📝 Next Steps

1. ✅ Backend is ready to use
2. Open `alenstec_app.html` in browser
3. Start backend with `npm start`
4. Framework automatically connects to API
5. Build frontned features that call the API

Good luck! 🚀
