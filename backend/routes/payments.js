const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { body, validationResult } = require('express-validator');

// Get all payments
router.get('/', async (req, res) => {
    try {
        const { bill_id, from_date, to_date, limit = 50, offset = 0 } = req.query;

        let query = `
      SELECT p.*, b.bill_number, c.name as customer_name
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        if (bill_id) {
            query += ` AND p.bill_id = $${paramCount}`;
            params.push(bill_id);
            paramCount++;
        }

        if (from_date) {
            query += ` AND p.payment_date >= $${paramCount}`;
            params.push(from_date);
            paramCount++;
        }

        if (to_date) {
            query += ` AND p.payment_date <= $${paramCount}`;
            params.push(to_date);
            paramCount++;
        }

        query += ` ORDER BY p.payment_date DESC, p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        res.json({ payments: result.rows });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// Get payments for a specific bill
router.get('/bill/:billId', async (req, res) => {
    try {
        const { billId } = req.params;
        const result = await db.query(
            'SELECT * FROM payments WHERE bill_id = $1 ORDER BY payment_date DESC',
            [billId]
        );
        res.json({ payments: result.rows });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// Record payment
router.post('/',
    [
        body('bill_id').isInt().withMessage('Valid bill ID is required'),
        body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
        body('payment_method').optional().isIn(['cash', 'upi', 'bank_transfer', 'cheque', 'card']),
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
                bill_id,
                amount,
                payment_date = new Date(),
                payment_method = 'cash',
                reference_number,
                notes
            } = req.body;

            // Get bill total and existing payments
            const billResult = await client.query(
                'SELECT total, payment_status FROM bills WHERE id = $1',
                [bill_id]
            );

            if (billResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Bill not found' });
            }

            const bill = billResult.rows[0];

            // Calculate total paid
            const paymentsResult = await client.query(
                'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE bill_id = $1',
                [bill_id]
            );

            const existingPaid = parseFloat(paymentsResult.rows[0].total_paid) || 0;
            const billTotal = parseFloat(bill.total) || 0;
            const paymentAmount = parseFloat(amount) || 0;
            const remainingAmount = billTotal - existingPaid;

            if (paymentAmount - remainingAmount > 0.0001) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Payment amount cannot exceed outstanding balance (${remainingAmount.toFixed(2)})`
                });
            }

            const totalPaid = existingPaid + paymentAmount;

            // Determine new payment status
            let newPaymentStatus;
            if (totalPaid >= billTotal - 0.0001) {
                newPaymentStatus = 'paid';
            } else if (totalPaid > 0) {
                newPaymentStatus = 'partial';
            } else {
                newPaymentStatus = 'unpaid';
            }

            // Record payment
            const paymentResult = await client.query(
                `INSERT INTO payments (bill_id, payment_date, amount, payment_method, reference_number, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
                [bill_id, payment_date, amount, payment_method, reference_number, notes]
            );

            // Update bill payment status
            await client.query(
                'UPDATE bills SET payment_status = $1 WHERE id = $2',
                [newPaymentStatus, bill_id]
            );

            await client.query('COMMIT');
            res.status(201).json(paymentResult.rows[0]);

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error recording payment:', error);
            res.status(500).json({ error: 'Failed to record payment' });
        } finally {
            client.release();
        }
    }
);

// Update payment
router.put('/:id', async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { amount, payment_date, payment_method, reference_number, notes } = req.body;

        const existingPaymentResult = await client.query(
            'SELECT id, bill_id, amount FROM payments WHERE id = $1',
            [id]
        );

        if (existingPaymentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Payment not found' });
        }

        const existingPayment = existingPaymentResult.rows[0];
        const nextAmount = amount === undefined || amount === null
            ? parseFloat(existingPayment.amount)
            : parseFloat(amount);

        if (Number.isNaN(nextAmount) || nextAmount <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Valid amount is required' });
        }

        const billResult = await client.query(
            'SELECT total FROM bills WHERE id = $1',
            [existingPayment.bill_id]
        );

        if (billResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Bill not found' });
        }

        const paymentsResult = await client.query(
            'SELECT COALESCE(SUM(amount), 0) as total_paid_excluding_current FROM payments WHERE bill_id = $1 AND id != $2',
            [existingPayment.bill_id, id]
        );

        const paidExcludingCurrent = parseFloat(paymentsResult.rows[0].total_paid_excluding_current) || 0;
        const billTotal = parseFloat(billResult.rows[0].total) || 0;
        const remainingAmount = billTotal - paidExcludingCurrent;

        if (nextAmount - remainingAmount > 0.0001) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Payment amount cannot exceed outstanding balance (${remainingAmount.toFixed(2)})`
            });
        }

        const result = await client.query(
            `UPDATE payments
       SET amount = COALESCE($1, amount),
           payment_date = COALESCE($2, payment_date),
           payment_method = COALESCE($3, payment_method),
           reference_number = COALESCE($4, reference_number),
           notes = COALESCE($5, notes)
       WHERE id = $6
       RETURNING *`,
            [amount, payment_date, payment_method, reference_number, notes, id]
        );

        const updatedTotalPaid = paidExcludingCurrent + nextAmount;
        const newPaymentStatus =
            updatedTotalPaid >= billTotal - 0.0001
                ? 'paid'
                : updatedTotalPaid > 0
                    ? 'partial'
                    : 'unpaid';

        await client.query(
            'UPDATE bills SET payment_status = $1 WHERE id = $2',
            [newPaymentStatus, existingPayment.bill_id]
        );

        await client.query('COMMIT');

        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating payment:', error);
        res.status(500).json({ error: 'Failed to update payment' });
    } finally {
        client.release();
    }
});

// Delete payment
router.delete('/:id', async (req, res) => {
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const { id } = req.params;

        // Get payment details
        const paymentResult = await client.query(
            'SELECT bill_id FROM payments WHERE id = $1',
            [id]
        );

        if (paymentResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Payment not found' });
        }

        const bill_id = paymentResult.rows[0].bill_id;

        // Delete payment
        await client.query('DELETE FROM payments WHERE id = $1', [id]);

        // Recalculate payment status
        const billResult = await client.query(
            'SELECT total FROM bills WHERE id = $1',
            [bill_id]
        );

        const paymentsResult = await client.query(
            'SELECT COALESCE(SUM(amount), 0) as total_paid FROM payments WHERE bill_id = $1',
            [bill_id]
        );

        const totalPaid = parseFloat(paymentsResult.rows[0].total_paid);
        const billTotal = parseFloat(billResult.rows[0].total);

        let newPaymentStatus;
        if (totalPaid >= billTotal) {
            newPaymentStatus = 'paid';
        } else if (totalPaid > 0) {
            newPaymentStatus = 'partial';
        } else {
            newPaymentStatus = 'unpaid';
        }

        await client.query(
            'UPDATE bills SET payment_status = $1 WHERE id = $2',
            [newPaymentStatus, bill_id]
        );

        await client.query('COMMIT');
        res.json({ message: 'Payment deleted successfully' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting payment:', error);
        res.status(500).json({ error: 'Failed to delete payment' });
    } finally {
        client.release();
    }
});

module.exports = router;
