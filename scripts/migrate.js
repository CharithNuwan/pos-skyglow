/**
 * Database migration script for Turso (SQLite-compatible)
 * Run: node scripts/migrate.js
 */
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const migrations = [
  `CREATE TABLE IF NOT EXISTS settings (
    setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    setting_description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

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

  // Admin user (password: password123) - bcrypt hash
  `INSERT OR IGNORE INTO users (username, email, password_hash, full_name, phone, role, is_active) VALUES
    ('admin', 'admin@pos.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', '+1 234 567 8900', 'admin', 1)`,

  // Sample categories
  `INSERT OR IGNORE INTO categories (category_name, description) VALUES ('Electronics', 'Electronic devices and accessories')`,
  `INSERT OR IGNORE INTO categories (category_name, description) VALUES ('Clothing', 'Apparel and fashion items')`,
  `INSERT OR IGNORE INTO categories (category_name, description) VALUES ('Food & Beverages', 'Edible items and drinks')`,
  `INSERT OR IGNORE INTO categories (category_name, description) VALUES ('Home & Garden', 'Home improvement and garden supplies')`,

  // Add short_name column if not exists (safe to run multiple times via try/catch in migrate fn)
  `ALTER TABLE products ADD COLUMN short_name TEXT`,
  `ALTER TABLE products ADD COLUMN pack_size INTEGER DEFAULT 1`,

  // Sample products
  `INSERT OR IGNORE INTO products (barcode, product_name, category_id, cost_price, selling_price, quantity, minimum_stock, description) VALUES
    ('1234567890123', 'Wireless Mouse', 1, 15.00, 29.99, 50, 10, 'Ergonomic wireless mouse with USB receiver')`,
  `INSERT OR IGNORE INTO products (barcode, product_name, category_id, cost_price, selling_price, quantity, minimum_stock, description) VALUES
    ('1234567890124', 'USB-C Cable', 1, 5.00, 12.99, 100, 20, 'Fast charging USB-C cable')`,
  `INSERT OR IGNORE INTO products (barcode, product_name, category_id, cost_price, selling_price, quantity, minimum_stock, description) VALUES
    ('1234567890125', 'T-Shirt Cotton', 2, 8.00, 19.99, 75, 15, '100% cotton comfortable t-shirt')`,
  `INSERT OR IGNORE INTO products (barcode, product_name, category_id, cost_price, selling_price, quantity, minimum_stock, description) VALUES
    ('1234567890126', 'Coffee Beans 500g', 3, 8.50, 16.99, 40, 10, 'Premium arabica coffee beans')`,
  `INSERT OR IGNORE INTO products (barcode, product_name, category_id, cost_price, selling_price, quantity, minimum_stock, description) VALUES
    ('1234567890127', 'LED Desk Lamp', 4, 20.00, 45.99, 30, 8, 'Adjustable LED desk lamp with dimmer')`,
];

async function migrate() {
  console.log('🚀 Running database migrations...');
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
  console.log('\n👤 Default login:');
  console.log('   Username: admin');
  console.log('   Password: password');
}

migrate().catch(console.error);
