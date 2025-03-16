const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;

const dbFile = './database.sqlite';

// Promisify database operations
function runAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function getAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function allAsync(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function initializeDatabase() {
    try {
        await fs.access(dbFile);
        console.log('Database file exists');
    } catch {
        console.log('Creating new database file');
        await fs.writeFile(dbFile, '');
    }

    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbFile, async (err) => {
            if (err) {
                console.error('Error connecting to SQLite database:', err);
                reject(err);
                return;
            }
            console.log('Connected to SQLite database');
            
            try {
                await createTables(db);
                console.log('Database initialization completed successfully');
                resolve(db);
            } catch (error) {
                console.error('Error during table creation:', error);
                reject(error);
            }
        });
    });
}

async function createTables(db) {
    try {
        await runAsync(db, 'BEGIN TRANSACTION');

        await runAsync(db, `
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                repo_url TEXT NOT NULL,
                check_interval INTEGER DEFAULT 5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await runAsync(db, `
            CREATE TABLE IF NOT EXISTS branches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                branch_name TEXT NOT NULL,
                last_commit_sha TEXT,
                FOREIGN KEY (project_id) REFERENCES projects (id)
                ON DELETE CASCADE
            )
        `);

        await runAsync(db, `
            CREATE TABLE IF NOT EXISTS check_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                branch_name TEXT NOT NULL,
                commit_sha TEXT,
                commit_message TEXT,
                commit_author TEXT,
                commit_date DATETIME,
                checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status TEXT,
                FOREIGN KEY (project_id) REFERENCES projects (id)
                ON DELETE CASCADE
            )
        `);

        await runAsync(db, `
            CREATE TABLE IF NOT EXISTS actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                name TEXT,
                action_type TEXT NOT NULL,
                webhook_url TEXT,
                script_content TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects (id)
                ON DELETE CASCADE
            )
        `);

        await runAsync(db, `
            CREATE TABLE IF NOT EXISTS secrets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action_id INTEGER,
                name TEXT NOT NULL,
                value TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (action_id) REFERENCES actions (id)
                ON DELETE CASCADE
            )
        `);

        await runAsync(db, 'COMMIT');
    } catch (err) {
        await runAsync(db, 'ROLLBACK');
        console.error('Error initializing database:', err);
        throw err;
    }
}

module.exports = {
    initializeDatabase,
    runAsync,
    getAsync,
    allAsync
};
