# POS System – Next.js + Turso

Converted from PHP/MySQL to Next.js 14 + Turso (SQLite).

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```
Fill in your Turso credentials from the dashboard screenshot.

### 3. Run database migration
```bash
node scripts/migrate.js
```
This creates all tables and inserts sample data.

### 4. Run locally
```bash
npm run dev
```
Visit http://localhost:3000

## Default Login
- **Username:** `admin`
- **Password:** `password`

## Deploy to Vercel

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/pos-system.git
git push -u origin main
```

### Step 2: Import on Vercel
1. Go to vercel.com → New Project
2. Import your GitHub repo
3. Add environment variables:
   - `TURSO_DATABASE_URL` — from Turso dashboard
   - `TURSO_AUTH_TOKEN` — from Turso dashboard  
   - `JWT_SECRET` — a random string (generate with `openssl rand -base64 32`)
4. Click Deploy

### Step 3: Run migrations against Turso
After deploying, run migrations locally with your production Turso credentials:
```bash
node scripts/migrate.js
```
(Your `.env.local` points to the same Turso DB, so this runs against the live DB)

## Project Structure
```
├── app/
│   ├── api/              # API routes (replaces PHP api/ folder)
│   │   ├── auth/         # Login/logout
│   │   ├── products/     # Products CRUD
│   │   ├── categories/   # Categories CRUD
│   │   ├── sales/        # Sales + refund
│   │   ├── reports/      # Reports data
│   │   ├── settings/     # Settings CRUD
│   │   └── users/        # Users CRUD
│   ├── dashboard/        # Dashboard page
│   ├── pos/              # POS terminal
│   ├── products/         # Products management
│   ├── categories/       # Categories management
│   ├── sales/            # Sales list
│   ├── reports/          # Reports page
│   ├── users/            # User management
│   ├── settings/         # System settings
│   ├── receipt/[id]/     # Receipt print page
│   └── login/            # Login page
├── components/
│   ├── AppLayout.tsx     # Authenticated layout with sidebar
│   └── Sidebar.tsx       # Navigation sidebar
├── lib/
│   ├── db.ts             # Turso database client
│   └── auth.ts           # JWT session management
└── scripts/
    └── migrate.js        # Database migration script
```

## Roles
- **Admin**: Full access (all pages + user management + settings)
- **Manager**: Products, categories, sales, reports
- **Cashier**: POS terminal + dashboard only
