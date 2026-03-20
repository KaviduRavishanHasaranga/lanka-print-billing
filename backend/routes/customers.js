const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { body, validationResult } = require('express-validator');

// Get all customers with optional search
router.get('/', async (req, res) => {
    try {
        const { search, billing_type, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT * FROM customers WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (search) {
            query += ` AND (name ILIKE $${paramCount} OR phone ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        if (billing_type) {
            query += ` AND billing_type = $${paramCount}`;
            params.push(billing_type);
            paramCount++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Get total count
        const countResult = await db.query('SELECT COUNT(*) FROM customers');

        res.json({
            customers: result.rows,
            total: parseInt(countResult.rows[0].count),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// Get single customer
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM customers WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
});

// Create customer
router.post('/',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('phone').optional().trim(),
        body('email').optional().isEmail().withMessage('Invalid email'),
        body('billing_type').optional().isIn(['instant', 'monthly']).withMessage('Invalid billing type'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { name, phone, email, address, gstin, billing_type = 'instant' } = req.body;

            const result = await db.query(
                `INSERT INTO customers (name, phone, email, address, gstin, billing_type)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
                [name, phone, email, address, gstin, billing_type]
            );

            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error('Error creating customer:', error);
            res.status(500).json({ error: 'Failed to create customer' });
        }
    }
);

// Update customer
router.put('/:id',
    [
        body('name').optional().trim().notEmpty(),
        body('email').optional().isEmail(),
        body('billing_type').optional().isIn(['instant', 'monthly']),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { id } = req.params;
            const { name, phone, email, address, gstin, billing_type } = req.body;

            const result = await db.query(
                `UPDATE customers
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone),
             email = COALESCE($3, email),
             address = COALESCE($4, address),
             gstin = COALESCE($5, gstin),
             billing_type = COALESCE($6, billing_type)
         WHERE id = $7
         RETURNING *`,
                [name, phone, email, address, gstin, billing_type, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Customer not found' });
            }

            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error updating customer:', error);
            res.status(500).json({ error: 'Failed to update customer' });
        }
    }
);

// Delete customer
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM customers WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json({ message: 'Customer deleted successfully', customer: result.rows[0] });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

module.exports = router;
