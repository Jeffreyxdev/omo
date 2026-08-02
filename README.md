# Udyking FIS — Financial Information System for SMEs

A full-stack, web-based **Financial Information System** built for independent retail
fuel stations (case study: **Udyking Filling Station**). It automates daily fuel sales
logging, cash reconciliation and underground tank inventory control, replacing manual
ledgers and slow sequential record processing with **direct-access (random indexing)**
data retrieval.

Built as an **npm-workspaces monorepo** that deploys entirely on **Vercel**.

---

## Features

| Module | What it does |
|--------|--------------|
| **Role-based access** | Manager, Supervisor and Attendant accounts with permission levels |
| **Shift sales logging** | Open a daily shift, enter opening/closing pump meter readings per fuel dispenser (PMS, AGO, DPK) |
| **Instant revenue math** | Litres sold and expected revenue computed automatically at the current pump price |
| **Cash reconciliation** | Supervisor enters physical cash + POS collected per pump; variance vs expected pump revenue flagged immediately |
| **Inventory control** | Record underground tank dip levels (opening, received, closing); system compares physical depletion against pump sales to detect shrinkage, leaks or unrecorded discharge |
| **Dashboard** | Today's volume/revenue, open shift status, 7-day sales chart, product-loss alerts |
| **Reports** | Daily and monthly sales reports, inventory variance reports over any date range |
| **Audit trail** | Every shift and inventory check records who opened/closed/recorded it |

## Technology Stack

- **Monorepo**: npm workspaces
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Route Handlers (serverless functions)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: HttpOnly JWT session cookies (jose), bcrypt password hashing
- **Validation**: Zod

## Monorepo Layout

```
.
├── apps/
│   └── web/                  # Next.js application (frontend + API routes)
│       └── src/
│           ├── app/          # Pages (login, dashboard, sales, inventory, pumps, users, reports)
│           │   └── api/      # REST API routes (auth, shifts, readings, inventory, ...)
│           ├── components/   # UI components (Nav, charts, forms, tables)
│           ├── lib/          # JWT, sessions, API helpers, date utils
│           └── middleware.ts # Session guard for pages and API routes
├── packages/
│   ├── db/                   # Prisma schema, database client, seed script
│   │   └── prisma/
│   │       ├── schema.prisma # Data model (User, Pump, Tank, Shift, PumpReading, InventoryCheck)
│   │       ├── migrations/   # SQL migration history
│   │       └── seed.ts       # Demo users, pumps, tanks and 8 days of sample data
│   └── shared/               # Shared types, constants and formatters
├── vercel.json               # Vercel monorepo configuration
└── scripts/setup-env.mjs     # Copies .env.example files into place
```

## Direct-Access Data Architecture (for your project defence)

The system replaces sequential file processing with a **direct-access (random indexing)
database architecture**:

- Every record is stored with a **hash-indexed primary key** (`cuid()`), so any single
  record — a shift, a pump reading, an inventory check — is located in **O(1) constant
  time** without scanning preceding records.
- Range queries (daily sales, monthly summaries) use **B-tree indexes** created
  automatically by PostgreSQL/Prisma on foreign keys and dates (`@@index`), giving
  **O(log n)** retrieval even as the dataset grows.
- Contrast with the manual/sequential approach described in the problem statement:
  locating one day's records never requires reading the other 299 days first.

## Getting Started (local development)

Requirements: Node.js 18+ and PostgreSQL running locally.

```bash
# 1. Install dependencies (installs all workspaces)
npm install

# 2. Create the environment files and edit them with your database credentials
npm run setup
#    - .env            (used by Prisma CLI)
#    - apps/web/.env   (used by Next.js)

# 3. Create the database (Homebrew example)
createdb udyking_fis

# 4. Generate the Prisma client and apply the migration
npm run db:generate
npm run db:migrate

# 5. Load demo data (users, pumps, tanks, 8 days of sales + inventory history)
npm run db:seed

# 6. Start the development server
npm run dev
# -> http://localhost:3000
```

### Default accounts (change these before going live!)

| Role | Email | Password |
|------|-------|----------|
| Manager | `admin@udyking.com` | `admin123` |
| Supervisor | `supervisor@udyking.com` | `supervisor123` |
| Attendant | `attendant@udyking.com` | `attendant123` |

### Useful commands

```bash
npm run dev          # Start Next.js development server
npm run build        # Production build
npm run typecheck    # TypeScript check across the web app
npm run db:studio    # Prisma Studio (visual database browser)
npm run db:reset     # Reset database and re-seed
npm run db:deploy    # Apply migrations (used in production builds)
```

## Deploying to Vercel

The whole system (frontend + API + database client) deploys as a single Vercel project —
no separate backend server to host.

1. **Push the repo to GitHub** and import it in Vercel.
   `vercel.json` is already configured with `rootDirectory: apps/web`, so Vercel
   builds the correct app automatically and runs `prisma migrate deploy` on every build.
2. **Create a free PostgreSQL database** at [neon.tech](https://neon.tech)
   (or any PostgreSQL host). Copy its connection string.
3. **Add the environment variables in Vercel** (Project → Settings → Environment Variables):
   - `DATABASE_URL` = your Neon connection string (e.g. `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`)
   - `JWT_SECRET` = a long random string (`openssl rand -base64 32`)
4. **Deploy.** The first build creates all tables via the committed migrations.
5. **Seed the database once** so you have your admin account and demo data.
   From your machine, with the Neon URL:
   ```bash
   DATABASE_URL="postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require" \
   npm run db:seed
   ```
6. Open your `*.vercel.app` URL and sign in with `admin@udyking.com / admin123`.

> Note: SQLite/MySQL are not used because Vercel's serverless filesystem is
> ephemeral — a hosted PostgreSQL (Neon, Supabase, Railway) keeps data persistent.
> The schema can be adapted to MySQL by changing `provider = "postgresql"` to
> `"mysql"` in `packages/db/prisma/schema.prisma` and regenerating.

## How the Sales Workflow Works

1. **Attendant** opens the day's shift → the system records the operator and time.
2. Attendant enters each pump's **opening and closing meter readings**. The system
   computes litres sold = closing − opening, and expected revenue = litres × price/litre.
   (Prices can be updated by the manager on the Pumps & Tanks page.)
3. **Supervisor/Manager** enters the physical cash and POS amounts collected per pump.
   The system flags any variance between expected pump revenue and cash collected —
   immediate detection of unrecorded sales or revenue diversion.
4. **Inventory check**: dip the tanks and enter opening level, litres received and
   closing level. The system compares physical depletion against recorded pump sales.
   A closing level below the expected value signals shrinkage (leak, theft, evaporation).
# omo
# omo
