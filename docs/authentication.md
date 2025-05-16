# Repo Radar Authentication System

This document explains how to set up and use the authentication system in Repo Radar.

## Overview

Repo Radar uses a simple but secure username/password authentication system with JWT (JSON Web Tokens) for maintaining sessions. The system includes:

- User registration and login
- Password hashing with bcrypt
- JWT token-based authentication
- Protected routes that require authentication

## Setup Instructions

### 1. Install Dependencies

First, make sure you have installed the required dependencies:

```bash
cd backend
npm install
```

### 2. Set Up Authentication

Run the authentication setup script:

```bash
npm run setup:auth
```

This script will:
- Add necessary authentication environment variables to your `.env` file
- Create an initial admin user in the database

### 3. Default Admin Credentials

After running the setup script, you can log in with the following default credentials:

- **Username**: admin
- **Password**: admin123

**Important**: For security reasons, please change the default password after your first login.

## Using Authentication

### Login

Users can log in through the login page at `/auth`. Upon successful login, they will be redirected to the main application.

### Protected Routes

All application routes are protected and require authentication. If a user tries to access a protected route without being authenticated, they will be redirected to the login page.

### User Menu

Once logged in, users can access their account menu by clicking on their avatar in the top-right corner of the application. From there, they can log out.

## Security Considerations

- Passwords are hashed using bcrypt before being stored in the database
- JWT tokens are signed with a secret key and expire after 24 hours
- The JWT secret key is randomly generated during setup
- Authentication state is persisted in the browser's localStorage

## Customizing Authentication

### Changing JWT Secret

For production environments, it's recommended to set a strong JWT secret in your `.env` file:

```
JWT_SECRET=your-strong-secret-key
```

### Changing Admin Credentials

You can change the default admin credentials in your `.env` file:

```
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-password
```

Then run the setup script again:

```bash
npm run setup:auth
```

## Troubleshooting

### Token Expired

If you encounter "Token expired" errors, you need to log in again to get a new token.

### Authentication Failed

If authentication fails, make sure:
- You're using the correct username and password
- Your database is properly set up and running
- The JWT_SECRET environment variable is set correctly
