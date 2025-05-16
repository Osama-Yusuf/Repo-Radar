const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { eq } = require('drizzle-orm');
const { db } = require('../config/database');
const { users } = require('../schema/schema');

class AuthController {
    constructor(db) {
        this.db = db;
    }

    // Register a new user
    async register(req, res) {
        try {
            const { username, password } = req.body;

            // Check if username already exists
            const existingUser = await this.db.select().from(users).where(eq(users.username, username));

            if (existingUser.length > 0) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            // Hash the password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Create user in database
            const newUser = await this.db.insert(users).values({
                username,
                password: hashedPassword
            }).returning();

            // Return success but don't include the password
            return res.status(201).json({
                id: newUser[0].id,
                username: newUser[0].username,
                createdAt: newUser[0].createdAt
            });
        } catch (error) {
            console.error('Error registering user:', error);
            return res.status(500).json({ error: 'Failed to register user' });
        }
    }

    // Login user
    async login(req, res) {
        try {
            const { username, password } = req.body;

            // Find user by username
            const user = await this.db.select().from(users).where(eq(users.username, username));

            if (user.length === 0) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            // Compare password
            const match = await bcrypt.compare(password, user[0].password);

            if (!match) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user[0].id, username: user[0].username },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            // Return token
            return res.status(200).json({
                token,
                user: {
                    id: user[0].id,
                    username: user[0].username
                }
            });
        } catch (error) {
            console.error('Error logging in:', error);
            return res.status(500).json({ error: 'Failed to login' });
        }
    }

    // Get current user info
    async getCurrentUser(req, res) {
        try {
            // User info is attached to req by the auth middleware
            return res.status(200).json({
                id: req.user.id,
                username: req.user.username
            });
        } catch (error) {
            console.error('Error getting current user:', error);
            return res.status(500).json({ error: 'Failed to get user information' });
        }
    }
}

module.exports = AuthController;
