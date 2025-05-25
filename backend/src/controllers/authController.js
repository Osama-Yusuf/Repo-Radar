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
            // The 'role' field will use its default value 'user' as defined in schema.js
            const newUser = await this.db.insert(users).values({
                username,
                password: hashedPassword
                // role: 'user' // Explicitly setting to 'user', or rely on DB default
            }).returning();

            // Return success but don't include the password
            return res.status(201).json({
                id: newUser[0].id,
                username: newUser[0].username,
                role: newUser[0].role, // Include role in response
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
                { id: user[0].id, username: user[0].username, role: user[0].role }, // Add role to JWT payload
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            // Return token
            return res.status(200).json({
                token,
                user: {
                    id: user[0].id,
                    username: user[0].username,
                    role: user[0].role // Include role in user object
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
                username: req.user.username,
                role: req.user.role // Include role from req.user
            });
        } catch (error) {
            console.error('Error getting current user:', error);
            return res.status(500).json({ error: 'Failed to get user information' });
        }
    }

    // List all users (Admin only)
    async listUsers(req, res) {
        try {
            const allUsers = await this.db.select({
                id: users.id,
                username: users.username,
                role: users.role,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt
            }).from(users);
            return res.status(200).json(allUsers);
        } catch (error) {
            console.error('Error listing users:', error);
            return res.status(500).json({ error: 'Failed to list users' });
        }
    }

    // Create a new user (Admin only)
    async createUser(req, res) {
        try {
            const { username, password, role } = req.body;

            if (!username || !password || !role) {
                return res.status(400).json({ error: 'Username, password, and role are required' });
            }
            if (!['user', 'admin'].includes(role)) {
                return res.status(400).json({ error: "Role must be 'user' or 'admin'" });
            }

            const existingUser = await this.db.select().from(users).where(eq(users.username, username));
            if (existingUser.length > 0) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const newUser = await this.db.insert(users).values({
                username,
                password: hashedPassword,
                role
            }).returning({
                id: users.id,
                username: users.username,
                role: users.role,
                createdAt: users.createdAt
            });

            return res.status(201).json(newUser[0]);
        } catch (error) {
            console.error('Error creating user:', error);
            return res.status(500).json({ error: 'Failed to create user' });
        }
    }

    // Update user role (Admin only)
    async updateUserRole(req, res) {
        try {
            const { userId } = req.params;
            const { newRole } = req.body;

            if (!newRole || !['user', 'admin'].includes(newRole)) {
                return res.status(400).json({ error: "Invalid role. Must be 'user' or 'admin'" });
            }
            
            const userIdNum = parseInt(userId, 10);
            if (isNaN(userIdNum)) {
                return res.status(400).json({ error: 'Invalid user ID format' });
            }

            // Prevent admin from changing their own role to 'user' if they are the only admin (optional safeguard)
            // This logic can be more complex depending on requirements (e.g., check count of admins)
            // For now, we allow changing any user's role.

            const updatedUser = await this.db.update(users)
                .set({ role: newRole, updatedAt: new Date() })
                .where(eq(users.id, userIdNum))
                .returning({
                    id: users.id,
                    username: users.username,
                    role: users.role,
                    updatedAt: users.updatedAt
                });

            if (updatedUser.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            return res.status(200).json(updatedUser[0]);
        } catch (error) {
            console.error('Error updating user role:', error);
            return res.status(500).json({ error: 'Failed to update user role' });
        }
    }

    // Delete a user (Admin only)
    async deleteUser(req, res) {
        try {
            const { userId } = req.params;
            const userIdNum = parseInt(userId, 10);
            if (isNaN(userIdNum)) {
                return res.status(400).json({ error: 'Invalid user ID format' });
            }

            // Optional: Prevent user from deleting themselves
            if (req.user.id === userIdNum) {
                return res.status(400).json({ error: "Cannot delete yourself." });
            }

            const deletedUser = await this.db.delete(users)
                .where(eq(users.id, userIdNum))
                .returning({ id: users.id, username: users.username });

            if (deletedUser.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            return res.status(200).json({ message: `User ${deletedUser[0].username} (ID: ${deletedUser[0].id}) deleted successfully` });
        } catch (error) {
            console.error('Error deleting user:', error);
            return res.status(500).json({ error: 'Failed to delete user' });
        }
    }
}

module.exports = AuthController;
