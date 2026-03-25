ALTER TABLE bills ADD COLUMN paid_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN vendor_id TEXT NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN payment_date TEXT NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN notes TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS payment_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL,
  bill_id INTEGER NOT NULL,
  adjusted_amount REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_bills_vendor_date ON bills(vendor_id, date);
CREATE INDEX IF NOT EXISTS idx_bills_vendor_status ON bills(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_vendor_date ON payments(vendor_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_adjustments_payment_id ON payment_adjustments(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_adjustments_bill_id ON payment_adjustments(bill_id);

UPDATE payments
SET payment_date = COALESCE(NULLIF(payment_date, ''), date)
WHERE COALESCE(NULLIF(date, ''), '') <> '';

UPDATE payments
SET vendor_id = COALESCE(NULLIF(vendor_id, ''), (
  SELECT b.vendor_id FROM bills b WHERE b.display_id = payments.bill_id LIMIT 1
), '')
WHERE COALESCE(NULLIF(vendor_id, ''), '') = '';

UPDATE bills
SET status = CASE
  WHEN lower(status) IN ('unpaid', 'pending') THEN 'pending'
  WHEN lower(status) IN ('partial', 'partially paid') THEN 'partial'
  WHEN lower(status) = 'paid' THEN 'paid'
  ELSE status
END;
