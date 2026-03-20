const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { body, validationResult } = require('express-validator');

// Get all bills with filters
router.get('/', async (req, res) => {
    try {
        const { customer_id, payment_status, from_date, to_date, limit = 50, offset = 0 } = req.query;

        let query = `
      SELECT b.*, c.name as customer_name, c.phone, c.email, c.address, c.gstin
      FROM bills b
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        if (customer_id) {
            query += ` AND b.customer_id = $${paramCount}`;
            params.push(customer_id);
            paramCount++;
        }

        if (payment_status) {
            query += ` AND b.payment_status = $${paramCount}`;
            params.push(payment_status);
            paramCount++;
        }

        if (from_date) {
            query += ` AND b.bill_date >= $${paramCount}`;
            params.push(from_date);
            paramCount++;
        }

        if (to_date) {
            query += ` AND b.bill_date <= $${paramCount}`;
            params.push(to_date);
            paramCount++;
        }

        query += ` ORDER BY b.bill_date DESC, b.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        res.json({ bills: result.rows });
    } catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({ error: 'Failed to fetch bills' });
    }
});

// Get single bill with items
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get bill details
        const billResult = await db.query(
            `SELECT b.*, c.name as customer_name, c.phone, c.email, c.address, c.gstin
       FROM bills b
       LEFT JOIN customers c ON b.customer_id = c.id
       WHERE b.id = $1`,
            [id]
        );

        if (billResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        // Get bill items
        const itemsResult = await db.query(
            'SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY id',
            [id]
        );

        // Get payments
        const paymentsResult = await db.query(
            'SELECT * FROM payments WHERE bill_id = $1 ORDER BY payment_date DESC',
            [id]
        );

        const bill = {
            ...billResult.rows[0],
            items: itemsResult.rows,
            payments: paymentsResult.rows
        };

        res.json(bill);
    } catch (error) {
        console.error('Error fetching bill:', error);
        res.status(500).json({ error: 'Failed to fetch bill' });
    }
});

// Generate next bill number in format INV-YYYY-XXXX
async function getNextBillNumber() {
    const year = new Date().getFullYear().toString();
    const prefix = `INV-${year}-`;

    const result = await db.query(
        `SELECT bill_number FROM bills
         WHERE bill_number LIKE $1
         ORDER BY CAST(SUBSTRING(bill_number FROM '[0-9]+$') AS INTEGER) DESC
         LIMIT 1`,
        [`${prefix}%`]
    );

    if (result.rows.length === 0) {
        return `${prefix}0001`;
    }

    const lastNumber = result.rows[0].bill_number;
    const lastSeq = parseInt(lastNumber.split('-')[2], 10) || 0;
    const nextSeq = (lastSeq + 1).toString().padStart(4, '0');
    return `${prefix}${nextSeq}`;
}

// Create instant bill
router.post('/',
    [
        body('customer_id').isInt().withMessage('Valid customer ID is required'),
        body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
        body('items.*.description').trim().notEmpty().withMessage('Item description is required'),
        body('items.*.quantity').isFloat({ min: 0.01 }).withMessage('Valid quantity is required'),
        body('items.*.rate').isFloat({ min: 0 }).withMessage('Valid rate is required'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const {
                customer_id,
                items,
                bill_date = new Date(),
                cgst = 0,
                sgst = 0,
                igst = 0,
                due_date,
                notes
            } = req.body;

            // Calculate totals
            const subtotal = items.reduce((sum, item) => {
                const amount = parseFloat(item.quantity) * parseFloat(item.rate);
                return sum + amount;
            }, 0);

            const total = subtotal + parseFloat(cgst) + parseFloat(sgst) + parseFloat(igst);

            // Generate bill number
            const bill_number = await getNextBillNumber();

            // Create bill
            const billResult = await client.query(
                `INSERT INTO bills (customer_id, bill_number, bill_date, subtotal, cgst, sgst, igst, total, due_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
                [customer_id, bill_number, bill_date, subtotal, cgst, sgst, igst, total, due_date, notes]
            );

            const bill = billResult.rows[0];

            // Create bill items
            for (const item of items) {
                const amount = parseFloat(item.quantity) * parseFloat(item.rate);
                await client.query(
                    `INSERT INTO bill_items (bill_id, order_id, description, quantity, rate, amount)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [bill.id, item.order_id || null, item.description, item.quantity, item.rate, amount]
                );

                // Mark order as billed if order_id is provided
                if (item.order_id) {
                    await client.query(
                        `UPDATE orders SET status = 'billed' WHERE id = $1`,
                        [item.order_id]
                    );
                }
            }

            await client.query('COMMIT');

            // Fetch complete bill
            const completeResult = await db.query(
                `SELECT b.*, c.name as customer_name, c.phone, c.email, c.address, c.gstin
         FROM bills b
         LEFT JOIN customers c ON b.customer_id = c.id
         WHERE b.id = $1`,
                [bill.id]
            );

            const itemsResult = await db.query(
                'SELECT * FROM bill_items WHERE bill_id = $1',
                [bill.id]
            );

            res.status(201).json({
                ...completeResult.rows[0],
                items: itemsResult.rows
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error creating bill:', error);
            res.status(500).json({ error: 'Failed to create bill' });
        } finally {
            client.release();
        }
    }
);

// Generate monthly consolidated bills
router.post('/monthly/generate', async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { month, year, customers: customerItems } = req.body;

        if (!month || !year) {
            return res.status(400).json({ error: 'Month and year are required' });
        }

        if (!customerItems || !Array.isArray(customerItems) || customerItems.length === 0) {
            return res.status(400).json({ error: 'At least one customer with items is required' });
        }

        const createdBills = [];

        for (const customerData of customerItems) {
            const { customer_id, items } = customerData;

            if (!items || items.length === 0) continue;

            const bill_number = await getNextBillNumber();
            const period_start = new Date(year, month - 1, 1);
            const period_end = new Date(year, month, 0);

            // Calculate subtotal from items
            const subtotal = items.reduce((sum, item) => {
                const qty = parseFloat(item.quantity) || 1;
                const rate = parseFloat(item.rate) || 0;
                return sum + (qty * rate);
            }, 0);

            const total = subtotal; // No tax for monthly bills by default

            // Create bill with proper totals
            const billResult = await client.query(
                `INSERT INTO bills (customer_id, bill_number, bill_date, billing_period_start, billing_period_end, subtotal, total)
         VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6)
         RETURNING *`,
                [customer_id, bill_number, period_start, period_end, subtotal, total]
            );

            const bill = billResult.rows[0];

            // Create bill items linked to orders
            for (const item of items) {
                const qty = parseFloat(item.quantity) || 1;
                const rate = parseFloat(item.rate) || 0;
                const amount = qty * rate;

                await client.query(
                    `INSERT INTO bill_items (bill_id, order_id, description, quantity, rate, amount)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [bill.id, item.order_id || null, item.description, qty, rate, amount]
                );
            }

            // Mark orders as billed
            const orderIds = items.filter(i => i.order_id).map(i => i.order_id);
            if (orderIds.length > 0) {
                await client.query(
                    `UPDATE orders SET status = 'billed' WHERE id = ANY($1)`,
                    [orderIds]
                );
            }

            createdBills.push(bill);
        }

        await client.query('COMMIT');
        res.status(201).json({ bills: createdBills, count: createdBills.length });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error generating monthly bills:', error);
        res.status(500).json({ error: 'Failed to generate monthly bills' });
    } finally {
        client.release();
    }
});

// Update bill
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_status, due_date, notes } = req.body;

        const result = await db.query(
            `UPDATE bills
       SET payment_status = COALESCE($1, payment_status),
           due_date = COALESCE($2, due_date),
           notes = COALESCE($3, notes)
       WHERE id = $4
       RETURNING *`,
            [payment_status, due_date, notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating bill:', error);
        res.status(500).json({ error: 'Failed to update bill' });
    }
});

// Delete bill
router.delete('/:id', async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;

        // Get associated order IDs
        const itemsResult = await client.query(
            'SELECT order_id FROM bill_items WHERE bill_id = $1 AND order_id IS NOT NULL',
            [id]
        );

        // Reset order status
        for (const item of itemsResult.rows) {
            await client.query(
                `UPDATE orders SET status = 'completed' WHERE id = $1`,
                [item.order_id]
            );
        }

        // Delete bill (cascade will delete items and payments)
        const result = await client.query('DELETE FROM bills WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Bill not found' });
        }

        await client.query('COMMIT');
        res.json({ message: 'Bill deleted successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting bill:', error);
        res.status(500).json({ error: 'Failed to delete bill' });
    } finally {
        client.release();
    }
});

module.exports = router;
