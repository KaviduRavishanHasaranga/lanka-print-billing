const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        // Find user
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, displayName: user.display_name },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                role: user.role,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// GET /api/auth/me — validate token and return user info
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, display_name, role FROM users WHERE id = $1', [req.user.id]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            role: user.role,
        });
    } catch (err) {
        console.error('Auth check error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
