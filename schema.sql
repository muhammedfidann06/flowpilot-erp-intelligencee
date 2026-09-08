-- Reference PostgreSQL model for a future persistent adapter.
-- The shipped static application and mock API read JSON; they do NOT connect to this database.
BEGIN;
-- Master data gets stable external IDs so ERP connectors can reconcile records without name matching.
CREATE TABLE suppliers (
  id text PRIMARY KEY,
  name text NOT NULL,
  region text NOT NULL,
  lead_time_days integer NOT NULL CHECK (lead_time_days >= 0),
  payment_days integer NOT NULL CHECK (payment_days >= 0)
);
CREATE TABLE customers (
  id text PRIMARY KEY,
  name text NOT NULL,
  region text NOT NULL
);
CREATE TABLE products (
  id text PRIMARY KEY,
  name text NOT NULL,
  supplier_id text NOT NULL REFERENCES suppliers(id),
  category text NOT NULL,
  unit_cost numeric(14,2) NOT NULL CHECK (unit_cost >= 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0)
);
-- A composite key preserves future inventory history instead of overwriting the previous stock state.
CREATE TABLE inventory_snapshots (
  product_id text NOT NULL REFERENCES products(id),
  as_of date NOT NULL,
  stock integer NOT NULL CHECK (stock >= 0),
  reserved integer NOT NULL CHECK (reserved >= 0 AND reserved <= stock),
  daily_demand numeric(12,3) NOT NULL CHECK (daily_demand >= 0),
  reorder_point numeric(12,3) NOT NULL CHECK (reorder_point >= 0),
  PRIMARY KEY (product_id, as_of)
);
-- One line per order matches this release; multi-line order headers / lines are a future migration.
CREATE TABLE sales_orders (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id),
  supplier_id text NOT NULL REFERENCES suppliers(id),
  customer_id text NOT NULL REFERENCES customers(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  order_date date NOT NULL,
  promised_date date NOT NULL,
  delivered_at date,
  status text NOT NULL CHECK (status IN ('open','processing','delivered')),
  region text NOT NULL,
  CHECK ((status = 'delivered') = (delivered_at IS NOT NULL)),
  CHECK (promised_date >= order_date),
  CHECK (delivered_at IS NULL OR delivered_at >= order_date)
);
CREATE TABLE purchase_orders (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES products(id),
  supplier_id text NOT NULL REFERENCES suppliers(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric(14,2) NOT NULL CHECK (unit_cost >= 0),
  order_date date NOT NULL,
  promised_date date NOT NULL,
  delivered_at date,
  status text NOT NULL CHECK (status IN ('open','processing','delivered')),
  region text NOT NULL,
  CHECK ((status = 'delivered') = (delivered_at IS NOT NULL)),
  CHECK (promised_date >= order_date),
  CHECK (delivered_at IS NULL OR delivered_at >= order_date)
);
-- Two nullable foreign keys plus XOR preserve referential integrity for both delivery types.
CREATE TABLE deliveries (
  id text PRIMARY KEY,
  sales_order_id text UNIQUE REFERENCES sales_orders(id),
  purchase_order_id text UNIQUE REFERENCES purchase_orders(id),
  supplier_id text NOT NULL REFERENCES suppliers(id),
  product_id text NOT NULL REFERENCES products(id),
  carrier text NOT NULL,
  region text NOT NULL,
  dispatch_date date NOT NULL,
  promised_date date NOT NULL,
  delivered_at date NOT NULL,
  CHECK ((sales_order_id IS NULL) <> (purchase_order_id IS NULL)),
  CHECK (delivered_at >= dispatch_date)
);
-- Period and relationship indexes support the application's most common drilldowns.
CREATE INDEX sales_orders_period_idx ON sales_orders(order_date);
CREATE INDEX sales_orders_customer_idx ON sales_orders(customer_id);
CREATE INDEX purchase_orders_supplier_idx ON purchase_orders(supplier_id, order_date);
CREATE INDEX deliveries_receipt_idx ON deliveries(delivered_at);
COMMIT;
