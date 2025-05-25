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

            // Find user in database to ensure they still exist
            const user = await db.select().from(users).where(eq(users.id, decoded.id));

            if (user.length === 0) {
                return res.status(401).json({ error: 'Invalid token. User not found' });
            }

            // Attach user info to request
            req.user = {
                id: user[0].id, // Use id from db record
                username: user[0].username, // Use username from db record
                role: user[0].role // Add role from db record
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
