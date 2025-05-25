// backend/tests/settings.test.js
const request = require('supertest');
const express =require('express');
const { db: mockDb } = require('../src/config/drizzle-client'); 
const { appSettings: appSettingsTableSchema } = require('../src/schema/schema');

// Mock the middleware
const authMiddleware = require('../src/middleware/authMiddleware');
jest.mock('../src/middleware/authMiddleware', () => ({
    verifyToken: jest.fn((req, res, next) => {
        next(); 
    }),
    isAdmin: jest.fn((req, res, next) => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            if (!req.user) {
                 res.status(401).json({ error: 'Access denied. No token provided' });
            } else {
                 res.status(403).json({ error: 'Forbidden' });
            }
        }
    }),
}));

const app = express();
app.use(express.json());

const settingsRoutes = require('../src/routes/settingsRoutes');
app.use('/api/settings', settingsRoutes); 

const adminUserId = 'admin-settings-id-123';
const regularUserId = 'user-settings-id-456';

const mockAdminUser = { id: adminUserId, username: 'testadmin_settings', role: 'admin' };
const mockRegularUser = { id: regularUserId, username: 'testuser_settings', role: 'user' };

const mockDefaultSettings = {
    id: 1,
    github_api_url: 'https://api.github.com',
    github_token: 'test_token_from_db',
    kubernetes_namespaces: ['default', 'dev'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};


describe('Settings API /api/settings', () => {
    beforeEach(() => {
        jest.clearAllMocks(); 
        
        // General Drizzle method mocks for chainability
        mockDb.select.mockReturnThis();
        mockDb.from.mockReturnThis();
        mockDb.where.mockReturnThis();
        mockDb.update.mockReturnThis();
        mockDb.set.mockReturnThis();
        // Terminal methods default to empty
        mockDb.returning.mockResolvedValue([]); 
        mockDb.execute.mockResolvedValue([]);  
    });

    describe('GET /api/settings', () => {
        it('should allow admin to get settings', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockAdminUser;
                next();
            });
            // Specific mock for: db.select().from(appSettingsTable).where(eq(appSettings.id, 1)).execute()
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        execute: jest.fn().mockResolvedValueOnce([mockDefaultSettings])
                    })
                })
            });

            const response = await request(app).get('/api/settings');
            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual(mockDefaultSettings);
        });
        
        it('should return 404 if settings not found', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockAdminUser;
                next();
            });
             mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        execute: jest.fn().mockResolvedValueOnce([]) // No settings found
                    })
                })
            });

            const response = await request(app).get('/api/settings');
            expect(response.statusCode).toBe(404);
        });

        it('should forbid non-admin user from getting settings', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockRegularUser; 
                next();
            });
            
            const response = await request(app).get('/api/settings');
            expect(response.statusCode).toBe(403);
        });

        it('should return 401 for unauthenticated user', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                next(); 
            });
            
            const response = await request(app).get('/api/settings');
            expect(response.statusCode).toBe(401); 
        });
    });

    describe('PUT /api/settings', () => {
        const newSettingsPayload = {
            github_api_url: 'https://new.github.com/api/v3',
            github_token: 'new_secure_token_value',
            kubernetes_namespaces: ['prod', 'staging', 'dev']
        };
        const updatedSettingsFromDb = { ...mockDefaultSettings, ...newSettingsPayload, updatedAt: new Date().toISOString() };

        it('should allow admin to update settings', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockAdminUser;
                next();
            });
            // Specific mock for: db.update(appSettingsTable).set(...).where(...).returning()
            mockDb.update.mockReturnValueOnce({
                set: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        returning: jest.fn().mockResolvedValueOnce([updatedSettingsFromDb])
                    })
                })
            });


            const response = await request(app).put('/api/settings').send(newSettingsPayload);
            expect(response.statusCode).toBe(200);
            expect(response.body.settings).toEqual(updatedSettingsFromDb);
            expect(mockDb.update).toHaveBeenCalledWith(appSettingsTableSchema);
        });
        
        it('should return 404 if settings not found to update', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockAdminUser;
                next();
            });
            mockDb.update.mockReturnValueOnce({
                set: jest.fn().mockReturnValueOnce({
                    where: jest.fn().mockReturnValueOnce({
                        returning: jest.fn().mockResolvedValueOnce([]) // Update returns empty
                    })
                })
            });

            const response = await request(app).put('/api/settings').send(newSettingsPayload);
            expect(response.statusCode).toBe(404);
        });

        // Other PUT tests (forbidden, unauthenticated, bad input) remain the same
        // as they primarily test middleware or validation before DB interaction.
        it('should forbid non-admin user from updating settings', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockRegularUser;
                next();
            });
            const response = await request(app).put('/api/settings').send(newSettingsPayload);
            expect(response.statusCode).toBe(403);
        });

        it('should return 401 for unauthenticated user', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                next(); 
            });
            const response = await request(app).put('/api/settings').send(newSettingsPayload);
            expect(response.statusCode).toBe(401);
        });

        it('should return 400 for missing fields', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockAdminUser;
                next();
            });
            const incompleteSettings = { github_api_url: 'https://incomplete.url' };
            const response = await request(app).put('/api/settings').send(incompleteSettings);
            expect(response.statusCode).toBe(400);
        });

        it('should return 400 if kubernetes_namespaces is not an array', async () => {
            authMiddleware.verifyToken.mockImplementation((req, res, next) => {
                req.user = mockAdminUser;
                next();
            });
            const invalidSettings = { ...newSettingsPayload, kubernetes_namespaces: "not-an-array" };
            const response = await request(app).put('/api/settings').send(invalidSettings);
            expect(response.statusCode).toBe(400);
        });
    });
});
