const { db, pool } = require('./drizzle');
const { eq, and, or, desc, asc, sql } = require('drizzle-orm');
const schema = require('../schema/schema');

async function initializeDatabase() {
    try {
        // Connect to database using Drizzle
        await pool.connect();
        console.log('Connected to database via Drizzle');

        // Return db instance for compatibility with controller methods
        return db;
    } catch (error) {
        console.error('Error connecting to database:', error);
        throw error;
    }
}

const allAsync = async (db, query, params = []) => {
    // Handle SQL-based queries by converting to Drizzle operations

    // Extract table name from SQL query for basic operations
    const model = query.toLowerCase().includes('from projects') ? schema.projects
        : query.toLowerCase().includes('from actions') ? schema.actions
            : query.toLowerCase().includes('from branches') ? schema.branches
                : query.toLowerCase().includes('from check_logs') ? schema.checkLogs
                    : query.toLowerCase().includes('from secrets') ? schema.secrets
                        : query.toLowerCase().includes('from webhook_parameters') ? schema.webhookParameters
                            : null;

    if (!model) {
        // For complex queries that can't be easily mapped, use raw SQL
        // This is a fallback for compatibility
        console.warn('Using raw SQL with Drizzle for query:', query);
        return db.execute(sql.raw(query, params));
    }

    // Basic SELECT operation
    let dbQuery = db.select().from(model);

    // Handle basic WHERE conditions if present in the query
    if (query.toLowerCase().includes('where')) {
        // This is a simplified handling and may need to be expanded based on your actual queries
        for (const param of params) {
            if (typeof param === 'object' && param !== null) {
                // Convert object params to conditions
                const conditions = Object.entries(param).map(([key, value]) =>
                    eq(model[key], value)
                );

                if (conditions.length > 0) {
                    dbQuery = dbQuery.where(and(...conditions));
                }
            }
        }
    }

    // Handle ORDER BY if present
    if (query.toLowerCase().includes('order by')) {
        if (query.toLowerCase().includes('desc')) {
            // Extract field name - this is simplified and might need improvement
            const field = query.match(/order by\s+(\w+)/i)?.[1];
            if (field && model[field]) {
                dbQuery = dbQuery.orderBy(desc(model[field]));
            }
        } else {
            const field = query.match(/order by\s+(\w+)/i)?.[1];
            if (field && model[field]) {
                dbQuery = dbQuery.orderBy(asc(model[field]));
            }
        }
    }

    // Handle LIMIT if present
    if (query.toLowerCase().includes('limit')) {
        const limit = query.match(/limit\s+(\d+)/i)?.[1];
        if (limit) {
            dbQuery = dbQuery.limit(parseInt(limit));
        }
    }

    return dbQuery;
};

const getAsync = async (db, query, params = []) => {
    // Similar to allAsync but fetches only the first result
    const results = await allAsync(db, query, params);

    // Handle array results from Drizzle queries
    if (Array.isArray(results)) {
        return results[0];
    }

    return results; // Might be a direct result object
};

const runAsync = async (db, query, params = []) => {
    // Handle SQL-based modification queries by converting to Drizzle operations

    const model = query.toLowerCase().includes('into projects') || query.toLowerCase().includes('update projects') ? schema.projects
        : query.toLowerCase().includes('into actions') || query.toLowerCase().includes('update actions') ? schema.actions
            : query.toLowerCase().includes('into branches') || query.toLowerCase().includes('update branches') ? schema.branches
                : query.toLowerCase().includes('into check_logs') ? schema.checkLogs
                    : query.toLowerCase().includes('into secrets') || query.toLowerCase().includes('update secrets') ? schema.secrets
                        : query.toLowerCase().includes('into webhook_parameters') || query.toLowerCase().includes('update webhook_parameters') ? schema.webhookParameters
                            : null;

    if (!model) {
        // For complex queries that can't be easily mapped, use raw SQL
        console.warn('Using raw SQL with Drizzle for modification query:', query);
        return db.execute(sql.raw(query, params));
    }

    // Handle INSERT operations
    if (query.toLowerCase().startsWith('insert')) {
        const data = params[0] || {};
        return db.insert(model).values(data).returning();
    }
    // Handle UPDATE operations
    else if (query.toLowerCase().startsWith('update')) {
        const data = params[0] || {};
        const id = params[1];

        if (id !== undefined) {
            return db.update(model)
                .set(data)
                .where(eq(model.id, id))
                .returning();
        } else {
            // Handle updates without specific ID conditions
            return db.update(model).set(data).returning();
        }
    }
    // Handle DELETE operations
    else if (query.toLowerCase().startsWith('delete')) {
        const id = params[0];

        if (id !== undefined) {
            return db.delete(model)
                .where(eq(model.id, id))
                .returning();
        } else {
            // Handle deletes without specific conditions (CAUTION: this will delete all records)
            return db.delete(model).returning();
        }
    }

    // Fallback for unrecognized operations
    return db.execute(sql.raw(query, params));
};

module.exports = {
    initializeDatabase,
    allAsync,
    getAsync,
    runAsync,
    db
};
