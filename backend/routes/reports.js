const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Dashboard statistics
router.get('/dashboard', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        // Today's sales
        const todaySalesResult = await db.query(
            `SELECT COALESCE(SUM(total), 0) as today_sales, COUNT(*) as today_bills
       FROM bills
       WHERE bill_date = $1`,
            [today]
        );

        // This month's revenue
        const monthRevenueResult = await db.query(
            `SELECT COALESCE(SUM(total), 0) as month_revenue, COUNT(*) as month_bills
       FROM bills
       WHERE bill_date >= $1`,
            [firstDayOfMonth]
        );

        // Pending payments
        const pendingPaymentsResult = await db.query(
            `SELECT COUNT(*) as pending_count, COALESCE(SUM(total), 0) as pending_amount
       FROM bills
       WHERE payment_status IN ('unpaid', 'partial')`
        );

        // Recent bills
        const recentBillsResult = await db.query(
            `SELECT b.*, c.name as customer_name
       FROM bills b
       LEFT JOIN customers c ON b.customer_id = c.id
       ORDER BY b.created_at DESC
       LIMIT 10`
        );

        res.json({
            today: {
                sales: parseFloat(todaySalesResult.rows[0].today_sales),
                bills: parseInt(todaySalesResult.rows[0].today_bills)
            },
            month: {
                revenue: parseFloat(monthRevenueResult.rows[0].month_revenue),
                bills: parseInt(monthRevenueResult.rows[0].month_bills)
            },
            pending: {
                count: parseInt(pendingPaymentsResult.rows[0].pending_count),
                amount: parseFloat(pendingPaymentsResult.rows[0].pending_amount)
            },
            recentBills: recentBillsResult.rows
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    }
});

// Sales report
router.get('/sales', async (req, res) => {
    try {
        const { from_date, to_date, group_by = 'day' } = req.query;

        if (!from_date || !to_date) {
            return res.status(400).json({ error: 'from_date and to_date are required' });
        }

        let dateFormat;
        if (group_by === 'month') {
            dateFormat = "TO_CHAR(bill_date, 'YYYY-MM')";
        } else {
            dateFormat = "bill_date::text";
        }

        // Get daily/monthly breakdown
        const result = await db.query(
            `SELECT ${dateFormat} as date,
              COUNT(*) as count,
              COALESCE(SUM(total), 0) as total
       FROM bills
       WHERE bill_date BETWEEN $1 AND $2
       GROUP BY date
       ORDER BY date`,
            [from_date, to_date]
        );

        // Calculate summary totals
        const summaryResult = await db.query(
            `SELECT COUNT(*) as bill_count,
              COALESCE(SUM(total), 0) as total_revenue
       FROM bills
       WHERE bill_date BETWEEN $1 AND $2`,
            [from_date, to_date]
        );

        res.json({
            summary: {
                total_revenue: parseFloat(summaryResult.rows[0].total_revenue),
                bill_count: parseInt(summaryResult.rows[0].bill_count)
            },
            breakdown: result.rows
        });
    } catch (error) {
        console.error('Error fetching sales report:', error);
        res.status(500).json({ error: 'Failed to fetch sales report' });
    }
});

// Customer statement
router.get('/customer/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { from_date, to_date } = req.query;

        // Get customer details
        const customerResult = await db.query(
            'SELECT * FROM customers WHERE id = $1',
            [id]
        );

        if (customerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Get bills
        let billQuery = 'SELECT * FROM bills WHERE customer_id = $1';
        const params = [id];

        if (from_date && to_date) {
            billQuery += ' AND bill_date BETWEEN $2 AND $3';
            params.push(from_date, to_date);
        }

        billQuery += ' ORDER BY bill_date DESC';

        const billsResult = await db.query(billQuery, params);

        // Get payments for these bills
        const billIds = billsResult.rows.map(b => b.id);
        let payments = [];

        if (billIds.length > 0) {
            const paymentsResult = await db.query(
                'SELECT * FROM payments WHERE bill_id = ANY($1) ORDER BY payment_date DESC',
                [billIds]
            );
            payments = paymentsResult.rows;
        }

        // Calculate totals
        const totalBilled = billsResult.rows.reduce((sum, bill) => sum + parseFloat(bill.total), 0);
        const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
        const balance = totalBilled - totalPaid;

        res.json({
            customer: customerResult.rows[0],
            bills: billsResult.rows,
            payments: payments,
            summary: {
                totalBilled,
                totalPaid,
                balance
            }
        });
    } catch (error) {
        console.error('Error fetching customer statement:', error);
        res.status(500).json({ error: 'Failed to fetch customer statement' });
    }
});

// Payment collection report
router.get('/payments', async (req, res) => {
    try {
        const { from_date, to_date } = req.query;

        let query = `
      SELECT 
        p.payment_date,
        p.payment_method,
        COUNT(*) as payment_count,
        COALESCE(SUM(p.amount), 0) as total_amount,
        c.name as customer_name,
        b.bill_number
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN customers c ON b.customer_id = c.id
      WHERE 1=1
    `;
        const params = [];

        if (from_date && to_date) {
            query += ' AND p.payment_date BETWEEN $1 AND $2';
            params.push(from_date, to_date);
        }

        query += ' GROUP BY p.payment_date, p.payment_method, c.name, b.bill_number ORDER BY p.payment_date DESC';

        const result = await db.query(query, params);
        res.json({ payments: result.rows });
    } catch (error) {
        console.error('Error fetching payment report:', error);
        res.status(500).json({ error: 'Failed to fetch payment report' });
    }
});

module.exports = router;
