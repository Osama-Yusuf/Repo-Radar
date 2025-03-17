const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

prisma.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    // console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
    return result;
});

process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

module.exports = prisma;