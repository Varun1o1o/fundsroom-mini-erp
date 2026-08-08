import * as dotenv from 'dotenv';
// Load environment variables first
dotenv.config();

import app from './app';
import prisma from './prisma';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify database connection
    console.log('Verifying connection to local MySQL server via Prisma...');
    await prisma.$connect();
    console.log('Connected to MySQL successfully.');

    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`  ERP SERVER IS LIVE AND RUNNING ON PORT ${PORT} `);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'} `);
      console.log(`  Local URL:   http://localhost:${PORT}        `);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Fatal error starting the ERP server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
