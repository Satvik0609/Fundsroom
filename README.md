# Mini ERP + CRM Operations Portal

A production-quality full-stack ERP/CRM system for wholesale/distribution companies. Built as a Full Stack Developer case study demonstrating REST APIs, PostgreSQL database design, JWT authentication, role-based authorization, and a professional React admin UI.

## Business Context

This portal supports internal teams (Sales, Warehouse, Accounts, Admin) managing:

- **Customers** — CRM with follow-ups
- **Products** — Inventory catalog with low-stock alerts
- **Stock** — IN/OUT movement tracking
- **Sales Challans** — Draft → Confirm workflow with atomic stock deduction

## Features

- JWT authentication with bcrypt password hashing
- Role-based access control (ADMIN, SALES, WAREHOUSE, ACCOUNTS)
- Customer CRM with search, pagination, follow-up history
- Product inventory with low-stock indicators
- Stock movements with transaction safety (no negative stock)
- Sales challan lifecycle (DRAFT → CONFIRMED / CANCELLED)
- Atomic challan confirmation with stock validation
- Product snapshot on challan items (price/name preserved)
- Admin dashboard with operational KPIs
- Postman collection for API testing
- Jest test suite covering critical business logic

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, TypeScript, Express.js |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT, bcryptjs |
| Validation | Zod |
| Frontend | React, TypeScript, Vite |
| Testing | Jest, Supertest |

## Architecture

```
┌─────────────┐     REST/JSON      ┌─────────────┐     Prisma      ┌────────────┐
│  React SPA  │ ◄──────────────►  │  Express API │ ◄────────────► │ PostgreSQL │
│  (Vite)     │    JWT Auth        │  + Zod       │   Transactions │            │
└─────────────┘                    └─────────────┘                └────────────┘
```

## Folder Structure

```
mini-erp-crm/
├── backend/
│   ├── prisma/          # Schema, migrations, seed
│   ├── src/
│   │   ├── config/      # Environment config
│   │   ├── controllers/ # Route handlers
│   │   ├── middleware/  # Auth, validation, errors
│   │   ├── routes/      # Express routes
│   │   ├── services/    # Business logic
│   │   ├── validation/  # Zod schemas
│   │   └── utils/       # Helpers
│   └── tests/           # Jest test suite
├── frontend/
│   └── src/
│       ├── components/
│       ├── context/     # Auth context
│       ├── layouts/     # App shell
│       ├── pages/       # Route pages
│       ├── services/    # API client
│       └── styles/      # CSS
├── postman/             # Postman collection
└── README.md
```

## Database Schema

| Entity | Key Fields |
|--------|-----------|
| User | email, passwordHash, role |
| Customer | customerName, mobile, type, status, followUpDate |
| CustomerFollowUp | customerId, note, followUpDate |
| Product | sku (unique), unitPrice, currentStock, minimumStock |
| StockMovement | productId, quantityChanged, movementType (IN/OUT) |
| SalesChallan | challanNumber (auto), status, totalQuantity |
| SalesChallanItem | product snapshots (name, sku, price) |
| ChallanSequence | year, lastNo (for SC-YYYY-NNNNNN numbers) |

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mini_erp_crm?schema=public
JWT_SECRET=change-this-to-a-long-random-secret-in-production
PORT=5000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000
```

## PostgreSQL Setup

### Option 1: Local PostgreSQL

```sql
CREATE DATABASE mini_erp_crm;
```

### Option 2: Neon (Free Cloud PostgreSQL)

1. Create account at [neon.tech](https://neon.tech)
2. Create a project and copy the connection string
3. Set `DATABASE_URL` in backend `.env`

## Local Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Backend runs at **http://localhost:5000**

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

## Prisma Commands

```bash
npx prisma generate          # Generate client
npx prisma migrate dev         # Run migrations (dev)
npx prisma migrate deploy      # Run migrations (production)
npx prisma db seed             # Seed demo data
npx prisma studio              # Visual DB browser
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@erp.local | Pass@123 |
| Sales | sales@erp.local | Pass@123 |
| Warehouse | warehouse@erp.local | Pass@123 |
| Accounts | accounts@erp.local | Pass@123 |

## API Endpoints

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| POST | /auth/login | Public | Login |
| GET | /auth/me | All | Current user |
| GET | /health | Public | Health check |
| GET | /dashboard | All | Dashboard stats |
| GET/POST | /customers | SALES+ | List/create customers |
| GET/PUT | /customers/:id | SALES+ | Get/update customer |
| POST | /customers/:id/followups | SALES+ | Add follow-up |
| GET/POST | /products | WAREHOUSE+ | List/create products |
| PUT | /products/:id | WAREHOUSE+ | Update product |
| GET/POST | /products/:id/movements | WAREHOUSE+ | Stock movements |
| GET | /products/movements/all | All | All movements |
| GET/POST | /challans | SALES+ | List/create challans |
| GET | /challans/:id | SALES+ | Get challan |
| PUT | /challans/:id | SALES+ | Update draft challan |
| POST | /challans/:id/confirm | SALES+ | Confirm challan |
| POST | /challans/:id/cancel | SALES+ | Cancel draft challan |

## Postman

Import `postman/Mini-ERP-CRM.postman_collection.json` into Postman.

1. Run **Login (Admin)** — token is auto-saved
2. Run other requests in order
3. Negative tests included for validation and insufficient stock

## Business Logic: Challan Confirmation

This is the most critical workflow:

### Draft Challan
- Does **NOT** affect stock
- Can be edited or cancelled

### Confirm Challan (Atomic Transaction)
1. Start database transaction
2. Load all challan items
3. Check stock for **every** item
4. If **any** item has insufficient stock:
   - Return HTTP **409**
   - **No** stock changes
   - **No** stock movements created
   - Challan stays **DRAFT**
5. If all items have sufficient stock:
   - Reduce stock for each product
   - Create OUT stock movement for each
   - Mark challan **CONFIRMED**
   - Commit transaction

### State Rules
- DRAFT → CONFIRMED ✓
- DRAFT → CANCELLED ✓
- CONFIRMED → DRAFT ✗
- CONFIRMED → CONFIRMED ✗
- CANCELLED → CONFIRMED ✗
- **Confirmed challans cannot be cancelled** (stock already deducted; reversing would require a separate return workflow)

## Running Tests

```bash
cd backend
npm test
```

Tests cover: auth, customer CRUD, stock movements, challan draft/confirm, insufficient stock rollback.

## Deployment

### Backend → Render

1. Create Web Service on [render.com](https://render.com)
2. Connect GitHub repo, set root to `backend`
3. Build: `npm install && npx prisma generate && npm run build`
4. Start: `npx prisma migrate deploy && npm start`
5. Environment variables:
   - `DATABASE_URL` — Neon connection string
   - `JWT_SECRET` — secure random string
   - `CORS_ORIGIN` — frontend URL
   - `PORT` — 5000

### Database → Neon

1. Create free PostgreSQL at [neon.tech](https://neon.tech)
2. Copy connection string to Render `DATABASE_URL`

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. Set root to `frontend`
3. Environment: `VITE_API_URL=https://your-backend.onrender.com`
4. Deploy

## Assumptions

- Indian mobile number format (10 digits, starts with 6-9)
- INR currency formatting
- GST number validation (standard 15-char format)
- Only draft challans can be cancelled (no stock reversal for confirmed)
- Challan numbers format: `SC-YYYY-NNNNNN`

## Known Limitations

- No PDF invoice export (future enhancement)
- No email notifications
- No multi-warehouse support
- No purchase order module
- Single currency (INR)

## Future Improvements

- PDF challan/invoice export
- Docker Compose for one-command setup
- GitHub Actions CI pipeline
- Purchase orders and supplier management
- Advanced reporting and analytics
- Audit log for all changes

## Git Commands

```bash
git init
git add .
git commit -m "Initial commit: Mini ERP + CRM Operations Portal"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mini-erp-crm.git
git push -u origin main
```

## Troubleshooting

### Windows: `npx` fails with PostgreSQL PATH error

If `npx prisma` fails with `spawn C:\Program Files\PostgreSQL\18\bin ENOENT`, your system PATH may contain a broken PostgreSQL entry. Use the npm scripts in `backend/package.json` which call Prisma via `node` directly:

```bash
npm run db:generate
npm run db:migrate
```

Or fix your PATH so `C:\Program Files\PostgreSQL\18\bin` is a valid directory entry (not a standalone executable path).

### PostgreSQL connection refused / auth failed

Update `DATABASE_URL` in `backend/.env` with your actual PostgreSQL username and password:

```env
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/mini_erp_crm?schema=public
```

Create the database first:

```sql
CREATE DATABASE mini_erp_crm;
```

## License

MIT
