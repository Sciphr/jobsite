// Create a new file: app/lib/appPrisma.js

import { PrismaClient } from "../generated/prisma";

// For auth operations (requires direct connection)
export const authPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL,
    },
  },
});

// For general operations (can use pooling)
export const appPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// For backwards compatibility
export const prisma = appPrisma;

export default appPrisma;
