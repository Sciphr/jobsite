// lib/db.js
import { PrismaClient } from "../../app/generated/prisma";

const globalForPrisma = globalThis;

// For auth operations (direct connection)
export const authDb =
  globalForPrisma.authPrisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL,
      },
    },
  });

// For general operations (pooled connection)
export const db =
  globalForPrisma.appPrisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.authPrisma = authDb;
  globalForPrisma.appPrisma = db;
}
