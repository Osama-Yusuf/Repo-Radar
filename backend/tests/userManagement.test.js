// backend/tests/userManagement.test.js
const request = require('supertest');
const express = require('express');
// const jwt = require('jsonwebtoken'); // Not needed if middleware is fully mocked
const { db: mockDb } = require('../src/config/drizzle-client'); 
const { users: usersTableSchema } = require('../src/schema/schema');

// Mock the middleware
const authMiddleware = require('../src/middleware/authMiddleware');
jest.mock('../src/middleware/authMiddleware', () => ({
    verifyToken: jest.fn((req, res, next) => next()), 
    isAdmin: jest.fn((req, res, next) => { 
        if (req.user && req.user.role === 'admin') next();
        else if (!req.user) res.status(401).json({ error: 'Access denied. No token provided' });
        else res.status(403).json({ error: 'Forbidden' });
    }),
}));


const app = express();
app.use(express.json());

// Import controller and routes AFTER middleware mocks
const AuthController = require('../src/controllers/authController');
const authRoutesSetup = require('../src/routes/authRoutes');

const authControllerInstance = new AuthController(mockDb); // Controller uses the mockDb
app.use('/api/auth', authRoutesSetup(authControllerInstance));


const adminUserId = 'admin-um-id-123';
const regularUserId = 'user-um-id-456';
const createdUserIdByAdmin = 'created-by-admin-id';

// Ensure mock users have all fields the controller might expect, especially password for login
const mockAdminUser = { id: adminUserId, username: 'testadmin_um', role: 'admin', password: 'hashed_adminpass_um', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
const mockRegularUser = { id: regularUserId, username: 'testuser_um', role: 'user', password: 'hashed_userpass_um', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };


describe('User Management API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default Drizzle method mocks
        mockDb.select.mockReturnThis();
        mockDb.from.mockReturnThis();
        mockDb.where.mockReturnThis();
        mockDb.returning.mockResolvedValue([]); 
        mockDb.execute.mockResolvedValue([]);  
        
        mockDb.insert.mockReturnThis();
        mockDb.values.mockReturnThis();
        mockDb.update.mockReturnThis();
        mockDb.set.mockReturnThis();
        mockDb.delete.mockReturnThis();
    });

    describe('Auth Endpoints Role Verification', () => {
        it('POST /api/auth/register - should register a user with default "user" role', async () => {
            const newUserData = { username: 'register_um_test', password: 'password123' };
            const registeredUserDbResponse = { id: 'new-user-id', username: newUserData.username, role: 'user', createdAt: new Date().toISOString(), password: `hashed_${newUserData.password}` };
            
            // 1. Mock for AuthController.register's check for existing user (none)
            // db.select().from(users).where(eq(users.username, username)).execute()
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        execute: jest.fn().mockResolvedValueOnce([])
                    })
                })
            });
            // 2. Mock for AuthController.register's insert new user
            // db.insert(users).values(...).returning()
            mockDb.insert.mockReturnValueOnce({
                values: jest.fn().mockReturnValueOnce({
                    returning: jest.fn().mockResolvedValueOnce([registeredUserDbResponse])
                })
            });


            const res = await request(app).post('/api/auth/register').send(newUserData);
            
            expect(res.statusCode).toBe(201);
            expect(res.body.username).toBe(newUserData.username);
            expect(res.body.role).toBe('user');
        });

        it('POST /api/auth/login - should return user role in response and token payload', async () => {
            // 1. Mock for AuthController.login's find user by username
            // db.select().from(users).where(eq(users.username, username)).execute()
             mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        execute: jest.fn().mockResolvedValueOnce([mockAdminUser]) // User found
                    })
                })
            });
            
            const res = await request(app).post('/api/auth/login').send({ username: mockAdminUser.username, password: 'adminpass_um' }); 
            
            expect(res.statusCode).toBe(200);
            expect(res.body.user.role).toBe('admin');
        });
        
        it('POST /api/auth/login - should return 401 if user not found', async () => {
             mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        execute: jest.fn().mockResolvedValueOnce([]) // User not found
                    })
                })
            });
            
            const res = await request(app).post('/api/auth/login').send({ username: "nonexistentuser", password: 'password' });
            expect(res.statusCode).toBe(401); 
        });


        it('GET /api/auth/me - should return current user info including role', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockRegularUser; 
                next();
            });
            // Note: The actual verifyToken middleware does a DB lookup.
            // Since we're mocking verifyToken directly to set req.user,
            // no DB mock is needed here for verifyToken itself.
            // The /me controller directly uses req.user.

            const res = await request(app).get('/api/auth/me');
            
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe(regularUserId);
            expect(res.body.role).toBe('user');
        });
    });

    describe('Admin User Management Routes (/api/auth/users)', () => {
        it('GET /users - admin should get list of users', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockAdminUser;
                next();
            });
            const mockUserList = [mockAdminUser, mockRegularUser];
            // Mock for AuthController.listUsers's data lookup
            // db.select({ id, username, role, createdAt, updatedAt }).from(usersTable).execute()
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    execute: jest.fn().mockResolvedValueOnce(mockUserList)
                })
            });


            const res = await request(app).get('/api/auth/users');
            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(mockUserList.length);
        });

        it('GET /users - non-admin should be forbidden', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockRegularUser; 
                next();
            });
            const res = await request(app).get('/api/auth/users');
            expect(res.statusCode).toBe(403);
        });

        it('POST /users - admin should create a new user', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockAdminUser;
                next();
            });
            const newUserPayload = { username: 'newlycreated_um', password: 'newpassword', role: 'user' };
            const createdUserDbResponse = { id: createdUserIdByAdmin, ...newUserPayload, createdAt: new Date().toISOString() };
            
            // 1. Mock for AuthController.createUser's check for existing user (none)
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        execute: jest.fn().mockResolvedValueOnce([])
                    })
                })
            });
            // 2. Mock for AuthController.createUser's insert new user
            mockDb.insert.mockReturnValueOnce({
                values: jest.fn().mockReturnValueOnce({
                    returning: jest.fn().mockResolvedValueOnce([createdUserDbResponse])
                })
            });

            const res = await request(app).post('/api/auth/users').send(newUserPayload);
            expect(res.statusCode).toBe(201);
            expect(res.body.username).toBe(newUserPayload.username);
        });
        
        it('POST /users - non-admin should be forbidden from creating user', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockRegularUser;
                next();
            });
            const newUserPayload = { username: 'another_user_um', password: 'password', role: 'user' };
            const res = await request(app).post('/api/auth/users').send(newUserPayload);
            expect(res.statusCode).toBe(403);
        });

        it('PUT /users/:userId/role - admin should update user role', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockAdminUser;
                next();
            });
            const updatedUserDbResponse = { ...mockRegularUser, role: 'admin', updatedAt: new Date().toISOString() };
            // Mock for AuthController.updateUserRole's update operation
            // db.update(users).set(...).where(...).returning()
            mockDb.update.mockReturnValueOnce({
                set: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        returning: jest.fn().mockResolvedValueOnce([updatedUserDbResponse])
                    })
                })
            });

            const res = await request(app).put(`/api/auth/users/${regularUserId}/role`).send({ newRole: 'admin' });
            expect(res.statusCode).toBe(200);
            expect(res.body.role).toBe('admin');
        });
        
        it('PUT /users/:userId/role - non-admin should be forbidden', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockRegularUser;
                next();
            });
            const res = await request(app).put(`/api/auth/users/${regularUserId}/role`).send({ newRole: 'admin' });
            expect(res.statusCode).toBe(403);
        });

        it('DELETE /users/:userId - admin should delete a user', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockAdminUser;
                next();
            });
            const userToDeleteId = 'user-to-delete-id';
            const deletedUserDbResponse = { id: userToDeleteId, username: 'temp_delete_um' };
            // Mock for AuthController.deleteUser's delete operation
            // db.delete(users).where(...).returning()
            mockDb.delete.mockReturnValueOnce({
                where: jest.fn().mockReturnValueOnce({
                    returning: jest.fn().mockResolvedValueOnce([deletedUserDbResponse])
                })
            });

            const res = await request(app).delete(`/api/auth/users/${userToDeleteId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.message).toContain('deleted successfully');
        });

        it('DELETE /users/:userId - admin cannot delete themselves', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockAdminUser; 
                next();
            });
            const res = await request(app).delete(`/api/auth/users/${adminUserId}`);
            expect(res.statusCode).toBe(400);
        });
        
        it('DELETE /users/:userId - non-admin should be forbidden', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockRegularUser;
                next();
            });
            const res = await request(app).delete(`/api/auth/users/${regularUserId}`);
            expect(res.statusCode).toBe(403);
        });
    });
});
