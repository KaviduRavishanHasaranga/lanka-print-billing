-- Billing System Database Schema

-- Create database (run this separately)
-- CREATE DATABASE billing_system;

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(15),
    billing_type VARCHAR(20) DEFAULT 'instant' CHECK (billing_type IN ('instant', 'monthly')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders/Jobs table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    job_description TEXT NOT NULL,
    job_type VARCHAR(20) DEFAULT 'printing' CHECK (job_type IN ('printing', 'design')),
    quantity DECIMAL(10, 2) DEFAULT 1,
    rate DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'billed')),
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    billing_period_start DATE,
    billing_period_end DATE,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    cgst DECIMAL(10, 2) DEFAULT 0,
    sgst DECIMAL(10, 2) DEFAULT 0,
    igst DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bill items table
CREATE TABLE IF NOT EXISTS bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    rate DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'card')),
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_customers_billing_type ON customers(billing_type);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_bills_customer_id ON bills(customer_id);
CREATE INDEX idx_bills_payment_status ON bills(payment_status);
CREATE INDEX idx_bills_bill_date ON bills(bill_date);
CREATE INDEX idx_bills_bill_number ON bills(bill_number);
CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_payments_bill_id ON payments(bill_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
