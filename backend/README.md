# Alenstec Backend Setup

## Prerequisites
- Node.js (v16+)
- PostgreSQL (v12+)
- npm or yarn

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure database connection:**
Edit `.env` with your PostgreSQL credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=alenstec_db
DB_USER=postgres
DB_PASSWORD=your_password
NODE_ENV=development
PORT=3000
```

3. **Create PostgreSQL database:**
```bash
createdb alenstec_db
```

4. **Start the server:**
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

5. **Seed sample data (optional):**
```bash
npm run seed
```

## API Endpoints

### Work Orders
- `GET /api/work-orders` - Get all work orders
- `GET /api/work-orders/:id` - Get single work order
- `POST /api/work-orders` - Create work order
- `PUT /api/work-orders/:id` - Update work order
- `DELETE /api/work-orders/:id` - Delete work order
- `GET /api/work-orders/kpi/summary` - Get KPI data

### Quotes
- `GET /api/quotes` - Get all quotes
- `GET /api/quotes/:id` - Get single quote
- `POST /api/quotes` - Create quote
- `PUT /api/quotes/:id` - Update quote
- `GET /api/quotes/kpi/open-count` - Get open quotes count

### Costs
- `GET /api/costs/material` - Get material costs
- `GET /api/costs/labor` - Get labor costs
- `POST /api/costs/material` - Create material cost
- `POST /api/costs/labor` - Create labor cost
- `GET /api/costs/kpi/material-transit` - Get material in transit

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `GET /api/suppliers/:id` - Get single supplier
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/:id` - Update supplier

## Health Check
```bash
curl http://localhost:3000/api/health
```

## Database Schema

### work_orders
- id (UUID)
- otNumber (STRING, unique)
- client, description, type, progress, status
- quotedCost, actualCost, currency
- startDate, endDate, createdAt, updatedAt

### quotes
- id (UUID)
- quoteNumber (STRING, unique)
- client, description, amount, currency, status
- validUntil, createdAt, updatedAt

### material_costs
- id (UUID)
- otNumber, materialDescription, quantity
- unitCost, totalCost, currency
- supplier, status, deliveryDate
- createdAt, updatedAt

### labor_costs
- id (UUID)
- otNumber, employeeName, role
- hoursWorked, hourlyRate, totalCost, currency
- date, createdAt, updatedAt

### suppliers
- id (UUID)
- supplierName, description, categories (array)
- workOrders (array), status
- contactEmail, contactPhone
- createdAt, updatedAt

## Notes
- Uses Sequelize ORM for database operations
- CORS enabled for frontend communication
- All timestamps in UTC
- Database automatically syncs on server startup
