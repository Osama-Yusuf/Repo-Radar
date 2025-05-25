const jwt = require('jsonwebtoken');
const { eq } = require('drizzle-orm');
const { db } = require('../config/database');
const { users } = require('../schema/schema');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Access denied. No token provided' });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided' });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

            // Find user in database to ensure they still exist and get their current role
            const user = await db.select().from(users).where(eq(users.id, decoded.id));

            if (user.length === 0) {
                return res.status(401).json({ error: 'User no longer exists' });
            }

            // Always use the current user data from the database, not from the token
            // This ensures we have the most up-to-date role information
            req.user = {
                id: user[0].id,
                username: user[0].username,
                role: user[0].role // This will always be the current role from the database
            };

            next();
        } catch (error) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication error' });
    }
};

module.exports = {
    verifyToken,
    isAdmin: (req, res, next) => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Forbidden. Administrator access required.' });
        }
    }
};
