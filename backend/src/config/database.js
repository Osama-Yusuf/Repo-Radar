const prisma = require('./prisma');

async function initializeDatabase() {
    try {
        await prisma.$connect();
        console.log('Connected to database via Prisma');
        return prisma;
    } catch (error) {
        console.error('Error connecting to database:', error);
        throw error;
    }
}

const allAsync = async (db, query, params = []) => {
    const model = query.toLowerCase().includes('from projects') ? 'project'
        : query.toLowerCase().includes('from actions') ? 'action'
            : query.toLowerCase().includes('from branches') ? 'branch'
                : query.toLowerCase().includes('from check_logs') ? 'checkLog'
                    : query.toLowerCase().includes('from secrets') ? 'secret'
                        : null;

    if (!model) throw new Error('Unsupported table in query');

    return db[model].findMany();
};

const getAsync = async (db, query, params = []) => {
    const model = query.toLowerCase().includes('from projects') ? 'project'
        : query.toLowerCase().includes('from actions') ? 'action'
            : query.toLowerCase().includes('from branches') ? 'branch'
                : query.toLowerCase().includes('from check_logs') ? 'checkLog'
                    : query.toLowerCase().includes('from secrets') ? 'secret'
                        : null;

    if (!model) throw new Error('Unsupported table in query');

    return db[model].findFirst();
};

const runAsync = async (db, query, params = []) => {
    const model = query.toLowerCase().includes('into projects') || query.toLowerCase().includes('update projects') ? 'project'
        : query.toLowerCase().includes('into actions') || query.toLowerCase().includes('update actions') ? 'action'
            : query.toLowerCase().includes('into branches') || query.toLowerCase().includes('update branches') ? 'branch'
                : query.toLowerCase().includes('into check_logs') ? 'checkLog'
                    : query.toLowerCase().includes('into secrets') || query.toLowerCase().includes('update secrets') ? 'secret'
                        : null;

    if (!model) throw new Error('Unsupported table in query');

    if (query.toLowerCase().startsWith('insert')) {
        return db[model].create({
            data: params[0]
        });
    } else if (query.toLowerCase().startsWith('update')) {
        return db[model].update({
            where: { id: params[1] },
            data: params[0]
        });
    } else if (query.toLowerCase().startsWith('delete')) {
        return db[model].delete({
            where: { id: params[0] }
        });
    }
};

module.exports = {
    initializeDatabase,
    allAsync,
    getAsync,
    runAsync
};
