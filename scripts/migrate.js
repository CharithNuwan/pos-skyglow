/**
 * Database migration script for Turso (SQLite-compatible)
 * Run: node scripts/migrate.js
 * Skips (exits 0) when TURSO_DATABASE_URL is not set so CI/Vercel build can run without a DB.
 */
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const migrations = [
  `CREATE TABLE IF NOT EXISTS settings (
    setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    setting_description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, setting_key)
  )`,
  `ALTER TABLE settings ADD COLUMN company_id INTEGER DEFAULT 1`,
  `UPDATE settings SET company_id=1 WHERE company_id IS NULL`,

  `CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'cashier',
    avatar TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL,
    short_name TEXT,
  description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT UNIQUE,
    product_name TEXT NOT NULL,
    category_id INTEGER,
    cost_price REAL NOT NULL DEFAULT 0,
    selling_price REAL NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 5,
    description TEXT,
    image TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL
  )`,

  `CREATE TABLE IF NOT EXISTS sales (
    sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    discount_type TEXT,
    discount_value REAL DEFAULT 0,
    total_amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    transaction_id TEXT,
    payment_reference TEXT,
    cash_received REAL DEFAULT 0,
    change_amount REAL DEFAULT 0,
    notes TEXT,
    sale_date TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  )`,

  `CREATE TABLE IF NOT EXISTS sale_items (
    sale_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    cost_price REAL NOT NULL DEFAULT 0,
    total_price REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
  )`,

  `CREATE TABLE IF NOT EXISTS payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    amount REAL NOT NULL DEFAULT 0,
    transaction_id TEXT,
    payment_reference TEXT,
    gateway_response TEXT,
    payment_date TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS stock_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    user_id INTEGER,
    movement_type TEXT NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reference_id INTEGER,
    reference_type TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
  )`,



  // ─── NEW: Customers ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS customers (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT,
    address TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  // ─── NEW: Suppliers ─────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  `ALTER TABLE products ADD COLUMN supplier_id INTEGER REFERENCES suppliers(supplier_id)`,
  `ALTER TABLE sales ADD COLUMN customer_id INTEGER REFERENCES customers(customer_id)`,

  `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id)`,


  // ─── NEW: Shifts ────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS shifts (
    shift_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    opening_cash REAL DEFAULT 0,
    closing_cash REAL,
    expected_cash REAL,
    cash_difference REAL,
    total_sales_count INTEGER DEFAULT 0,
    total_sales_amount REAL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'open',
    started_at TEXT DEFAULT (datetime('now')),
    ended_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_shifts_user ON shifts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status)`,
  `ALTER TABLE sales ADD COLUMN shift_id INTEGER REFERENCES shifts(shift_id)`,
  `ALTER TABLE products ADD COLUMN image_url TEXT`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES ('barcode_sound', '1', 'Play beep on barcode scan')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES ('whatsapp_enabled', '0', 'Enable WhatsApp receipt sharing')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES ('whatsapp_number', '', 'Shop WhatsApp number with country code e.g. 94771234567')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES ('email_receipt_enabled', '0', 'Enable email receipt sharing')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES ('show_product_images', '1', 'Show product images on POS grid')`,

  // ─── NEW: Cash Drawer sessions ─────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS cash_drawer (
    drawer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    opening_cash REAL NOT NULL DEFAULT 0,
    closing_cash REAL,
    expected_cash REAL,
    cash_difference REAL,
    total_cash_sales REAL DEFAULT 0,
    total_online_sales REAL DEFAULT 0,
    total_sales INTEGER DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    opened_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  )`,

  // ─── NEW: Expenses ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS expenses (
    expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    description TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    reference TEXT,
    expense_date TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date)`,
  `CREATE INDEX IF NOT EXISTS idx_cash_drawer_status ON cash_drawer(status)`,

  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date)`,
  `CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)`,
  `CREATE INDEX IF NOT EXISTS idx_stock_logs_product ON stock_logs(product_id)`,

  // Default settings
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('shop_name', 'My Retail Shop', 'Name of the shop displayed on receipts')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('shop_address', '123 Main Street, City, Country', 'Shop address for receipts')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('shop_phone', '+1 234 567 8900', 'Shop contact phone number')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('shop_email', 'contact@myretailshop.com', 'Shop email address')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('currency_symbol', '$', 'Currency symbol for prices')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('tax_rate', '0', 'Default tax rate percentage')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('receipt_header', 'Thank you for shopping with us!', 'Header text on receipts')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('receipt_footer', 'Please come again!', 'Footer text on receipts')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('low_stock_threshold', '5', 'Default low stock alert threshold')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('receipt_width', '80', 'Thermal printer receipt width in mm')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('receipt_font_size', '13', 'Receipt base font size in pixels')`,


  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('barcode_sound', '1', 'Play beep sound when barcode is scanned')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('whatsapp_number', '', 'Shop WhatsApp number for sending receipts (with country code, e.g. 94771234567)')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('shop_email', '', 'Shop email address for sending receipts')`,
  `ALTER TABLE products ADD COLUMN image_url TEXT`,


  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('barcode_sound', '1', 'Play beep sound when barcode is scanned')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('whatsapp_number', '', 'WhatsApp number for receipts (with country code e.g. 94771234567)')`,
  `INSERT OR IGNORE INTO settings (setting_key, setting_value, setting_description) VALUES
    ('receipt_email', '', 'Shop email shown on receipts')`,

  `CREATE TABLE IF NOT EXISTS shifts (
    shift_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    opening_cash REAL DEFAULT 0,
    closing_cash REAL,
    expected_cash REAL,
    cash_difference REAL,
    total_sales INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'open',
    started_at TEXT DEFAULT (datetime('now')),
    ended_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  )`,
  `ALTER TABLE products ADD COLUMN image_url TEXT`,
  `ALTER TABLE sales ADD COLUMN shift_id INTEGER REFERENCES shifts(shift_id)`,
  `CREATE INDEX IF NOT EXISTS idx_shifts_user ON shifts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status)`,


  // ── Multi-company support ──────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS companies (
    company_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT    NOT NULL,
    slug         TEXT    UNIQUE,
    plan         TEXT    DEFAULT 'standard',
    max_users    INTEGER DEFAULT 10,
    max_products INTEGER DEFAULT 500,
    is_active    INTEGER DEFAULT 1,
    notes        TEXT,
    created_at   TEXT    DEFAULT (datetime('now')),
    updated_at   TEXT    DEFAULT (datetime('now'))
  )`,
  // Seed the default company from existing shop_name setting (company_id=1)
  `INSERT OR IGNORE INTO companies (company_id, company_name, slug, plan, is_active)
   VALUES (1, (SELECT setting_value FROM settings WHERE setting_key='shop_name' LIMIT 1), 'default', 'standard', 1)`,
  // Add company_id to all tables (ALTER TABLE ignores if column exists via try/catch)
  `ALTER TABLE users      ADD COLUMN company_id INTEGER DEFAULT 1`,
  `ALTER TABLE products   ADD COLUMN company_id INTEGER DEFAULT 1`,
  `ALTER TABLE categories ADD COLUMN company_id INTEGER DEFAULT 1`,
  `ALTER TABLE suppliers  ADD COLUMN company_id INTEGER DEFAULT 1`,
  `ALTER TABLE customers  ADD COLUMN company_id INTEGER DEFAULT 1`,
  `ALTER TABLE sales      ADD COLUMN company_id INTEGER DEFAULT 1`,
  `ALTER TABLE expenses   ADD COLUMN company_id INTEGER DEFAULT 1`,
  `ALTER TABLE cash_drawer ADD COLUMN company_id INTEGER DEFAULT 1`,
  `ALTER TABLE shifts     ADD COLUMN company_id INTEGER DEFAULT 1`,
  // Backfill all existing rows to company 1
  `UPDATE users      SET company_id=1 WHERE company_id IS NULL`,
  `UPDATE products   SET company_id=1 WHERE company_id IS NULL`,
  `UPDATE categories SET company_id=1 WHERE company_id IS NULL`,
  `UPDATE suppliers  SET company_id=1 WHERE company_id IS NULL`,
  `UPDATE customers  SET company_id=1 WHERE company_id IS NULL`,
  `UPDATE sales      SET company_id=1 WHERE company_id IS NULL`,
  `UPDATE expenses   SET company_id=1 WHERE company_id IS NULL`,
  // Superadmin user (company_id=0 means no company)
  `INSERT OR IGNORE INTO users (user_id, username, email, password_hash, full_name, role, company_id, is_active)
   VALUES (0, 'superadmin', 'super@admin.local',
   'SUPERADMIN_PASSWORD_PLACEHOLDER',
   'Super Admin', 'superadmin', 0, 1)`,
  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_products_company   ON products(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sales_company      ON sales(company_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_company      ON users(company_id)`,


  // ── Product Batches ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS product_batches (
    batch_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id    INTEGER NOT NULL,
    company_id    INTEGER NOT NULL DEFAULT 1,
    batch_number  TEXT    NOT NULL,
    barcode       TEXT    UNIQUE,
    cost_price    REAL    NOT NULL DEFAULT 0,
    selling_price REAL    NOT NULL DEFAULT 0,
    quantity      INTEGER NOT NULL DEFAULT 0,
    received_date TEXT    DEFAULT (date('now')),
    expiry_date   TEXT,
    notes         TEXT,
    status        TEXT    DEFAULT 'active',
    created_at    TEXT    DEFAULT (datetime('now')),
    updated_at    TEXT    DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_batches_product   ON product_batches(product_id)`,
  `CREATE INDEX IF NOT EXISTS idx_batches_barcode   ON product_batches(barcode)`,
  `CREATE INDEX IF NOT EXISTS idx_batches_company   ON product_batches(company_id)`,

  `ALTER TABLE sale_items ADD COLUMN batch_id INTEGER REFERENCES product_batches(batch_id)`,

  `CREATE TABLE IF NOT EXISTS print_jobs (
    job_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL DEFAULT 1,
    type TEXT NOT NULL DEFAULT 'receipt',
    status TEXT NOT NULL DEFAULT 'pending',
    payload TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    printed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status)`,
  `CREATE INDEX IF NOT EXISTS idx_print_jobs_company ON print_jobs(company_id)`,

  // Admin user (password: password123) - bcrypt hash
  `INSERT OR IGNORE INTO users (username, email, password_hash, full_name, phone, role, is_active) VALUES
    ('admin', 'admin@pos.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', '+1 234 567 8900', 'admin', 1)`,

  // No default categories or sample products — add your own via the app.

  // Add short_name column if not exists (safe to run multiple times via try/catch in migrate fn)
  `ALTER TABLE products ADD COLUMN short_name TEXT`,
  `ALTER TABLE products ADD COLUMN pack_size INTEGER DEFAULT 1`,

  // ─── Expenses: capital vs recurring ─────────────────────────────────────
  `ALTER TABLE expenses ADD COLUMN expense_type TEXT DEFAULT 'recurring'`,

  // ─── Warehouses & warehouse_stock ───────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS warehouses (
    warehouse_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(company_id, name),
    FOREIGN KEY (company_id) REFERENCES companies(company_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_warehouses_company ON warehouses(company_id)`,
  `CREATE TABLE IF NOT EXISTS warehouse_stock (
    product_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (product_id, warehouse_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_warehouse_stock_warehouse ON warehouse_stock(warehouse_id)`,
  // Default warehouse per company (idempotent)
  `INSERT OR IGNORE INTO warehouses (company_id, name, code, is_default)
   SELECT company_id, 'Main', 'MAIN', 1 FROM companies
   WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.company_id = companies.company_id AND w.name = 'Main')`,
  // Backfill warehouse_stock from products.quantity only when no row exists
  `INSERT OR IGNORE INTO warehouse_stock (product_id, warehouse_id, quantity)
   SELECT p.product_id, w.warehouse_id, p.quantity
   FROM products p
   JOIN warehouses w ON w.company_id = p.company_id AND w.is_default = 1
   WHERE NOT EXISTS (SELECT 1 FROM warehouse_stock ws WHERE ws.product_id = p.product_id AND ws.warehouse_id = w.warehouse_id)`,
];

async function migrate() {
  console.log('🚀 Running database migrations...');

  // Generate the superadmin password hash at runtime
  let bcrypt;
  try { bcrypt = require('bcryptjs'); } catch(e) {}
  if (bcrypt) {
    const saHash = await bcrypt.hash('superadmin123', 10);
    // Replace placeholder hash in migrations array
    for (let i = 0; i < migrations.length; i++) {
      if (migrations[i].includes('SUPERADMIN_PASSWORD_PLACEHOLDER')) {
        migrations[i] = migrations[i].replace('SUPERADMIN_PASSWORD_PLACEHOLDER', saHash);
      }
    }
  }

  for (let i = 0; i < migrations.length; i++) {
    try {
      await client.execute(migrations[i]);
      process.stdout.write('.');
    } catch (err) {
      // Ignore "duplicate column" errors from ALTER TABLE (already applied)
      if (err.message && (err.message.includes('duplicate column') || err.message.includes('already exists'))) {
        process.stdout.write('s'); // s = skipped
      } else {
        console.error(`\n❌ Migration ${i + 1} failed:`, err.message);
        console.error('SQL:', migrations[i].slice(0, 100));
      }
    }
  }
  console.log('\n✅ Migration complete!');
  console.log('\n👤 Default company login:');
  console.log('   Username: admin');
  console.log('   Password: password');
  console.log('\n🔐 Super Admin login:');
  console.log('   URL: /superadmin/login');
  console.log('   Username: superadmin');
  console.log('   Password: superadmin123');
}

migrate().catch(console.error);
