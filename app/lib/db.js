// lib/db.js
import { PrismaClient } from "../../app/generated/prisma";

const globalForPrisma = globalThis;

// For auth operations (use same connection as app)
export const authDb =
  globalForPrisma.authPrisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// For general operations (pooled connection with retry)
export const db =
  globalForPrisma.appPrisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Add connection resilience
    __internal: {
      engine: {
        connectionTimeout: 20000, // 20 seconds
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.authPrisma = authDb;
  globalForPrisma.appPrisma = db;
}
