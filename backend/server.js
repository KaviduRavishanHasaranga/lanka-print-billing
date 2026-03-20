const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth route (unprotected)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Auth middleware — protects all routes below
const authMiddleware = require('./middleware/authMiddleware');
app.use('/api', authMiddleware);

// Protected routes
const customersRoutes = require('./routes/customers');
const ordersRoutes = require('./routes/orders');
const billsRoutes = require('./routes/bills');
const paymentsRoutes = require('./routes/payments');
const reportsRoutes = require('./routes/reports');

app.use('/api/customers', customersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/reports', reportsRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Billing System API is running' });
});

// --- Production: serve frontend static files ---
if (process.env.NODE_ENV === 'production') {
    const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
    app.use(express.static(frontendDist));

    // SPA fallback — serve index.html for any non-API route
    app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});

module.exports = app;

