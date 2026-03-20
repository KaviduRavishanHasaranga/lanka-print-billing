const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { body, validationResult } = require('express-validator');

// Get description suggestions for autocomplete
router.get('/suggestions/descriptions', async (req, res) => {
    try {
        const { q = '' } = req.query;
        const searchTerm = `%${q}%`;

        // Get unique descriptions from orders and bill_items
        const result = await db.query(
            `SELECT DISTINCT description FROM (
                SELECT job_description as description FROM orders WHERE job_description ILIKE $1
                UNION
                SELECT description FROM bill_items WHERE description ILIKE $1
            ) AS combined
            ORDER BY description
            LIMIT 15`,
            [searchTerm]
        );

        // Clean descriptions: strip paper size suffixes like "( A3:1 A4:1 )"
        const cleaned = result.rows.map(r => {
            return r.description.replace(/\s*\(\s*[A-Za-z0-9:]+(?:\s+[A-Za-z0-9:]+)*\s*\)\s*$/, '').trim();
        });

        // Deduplicate after cleaning
        const unique = [...new Set(cleaned)].filter(d => d.length > 0).slice(0, 10);

        res.json({ suggestions: unique });
    } catch (error) {
        console.error('Error fetching description suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

// Get all orders with filters
router.get('/', async (req, res) => {
    try {
        const { customer_id, status, from_date, to_date, limit = 50, offset = 0 } = req.query;

        let query = `
      SELECT o.*, c.name as customer_name, c.billing_type
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;

        if (customer_id) {
            query += ` AND o.customer_id = $${paramCount}`;
            params.push(customer_id);
            paramCount++;
        }

        if (status) {
            query += ` AND o.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }

        if (from_date) {
            query += ` AND o.order_date >= $${paramCount}`;
            params.push(from_date);
            paramCount++;
        }

        if (to_date) {
            query += ` AND o.order_date <= $${paramCount}`;
            params.push(to_date);
            paramCount++;
        }

        query += ` ORDER BY o.order_date DESC, o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        res.json({ orders: result.rows });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get single order
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `SELECT o.*, c.name as customer_name, c.billing_type
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Create order
router.post('/',
    [
        body('customer_id').isInt().withMessage('Valid customer ID is required'),
        body('job_description').trim().notEmpty().withMessage('Job description is required'),
        body('order_date').optional().isDate(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { customer_id, order_date, job_description, job_type = 'printing', quantity = 1, rate = 0, notes, status = 'pending', paper_sizes } = req.body;

            const result = await db.query(
                `INSERT INTO orders (customer_id, order_date, job_description, job_type, quantity, rate, notes, status, paper_sizes, received_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         RETURNING *`,
                [customer_id, order_date || new Date(), job_description, job_type, quantity, rate, notes, status, paper_sizes ? JSON.stringify(paper_sizes) : null]
            );

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating order:', error);
            res.status(500).json({ error: 'Failed to create order' });
        }
    }
);

// Update order
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { customer_id, order_date, job_description, job_type, quantity, rate, notes, status, paper_sizes } = req.body;

        const result = await db.query(
            `UPDATE orders
       SET customer_id = COALESCE($1, customer_id),
           order_date = COALESCE($2, order_date),
           job_description = COALESCE($3, job_description),
           job_type = COALESCE($4, job_type),
           quantity = COALESCE($5, quantity),
           rate = COALESCE($6, rate),
           notes = COALESCE($7, notes),
           status = COALESCE($8, status),
           paper_sizes = $9
       WHERE id = $10
       RETURNING *`,
            [customer_id, order_date, job_description, job_type, quantity, rate, notes, status, paper_sizes ? JSON.stringify(paper_sizes) : null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Delete order
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

// Get unbilled orders for monthly customers
router.get('/unbilled/monthly', async (req, res) => {
    try {
        const { month, year } = req.query;

        let query = `
      SELECT o.*, c.name as customer_name, c.phone, c.email
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE c.billing_type = 'monthly'
        AND o.status != 'billed'
    `;

        const params = [];
        if (month && year) {
            query += ` AND EXTRACT(MONTH FROM o.order_date) = $1 AND EXTRACT(YEAR FROM o.order_date) = $2`;
            params.push(month, year);
        }

        // Printing jobs first, then design jobs; within each type sort by order_date
        query += ` ORDER BY c.name, CASE WHEN o.job_type = 'printing' THEN 0 ELSE 1 END, o.order_date`;

        const result = await db.query(query, params);

        // Group by customer
        const groupedByCustomer = result.rows.reduce((acc, order) => {
            if (!acc[order.customer_id]) {
                acc[order.customer_id] = {
                    customer_id: order.customer_id,
                    customer_name: order.customer_name,
                    phone: order.phone,
                    email: order.email,
                    orders: []
                };
            }
            acc[order.customer_id].orders.push(order);
            return acc;
        }, {});

        res.json({ customers: Object.values(groupedByCustomer) });
    } catch (error) {
        console.error('Error fetching unbilled orders:', error);
        res.status(500).json({ error: 'Failed to fetch unbilled orders' });
    }
});

module.exports = router;
