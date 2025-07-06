// app/lib/prisma.js
import { db, authDb } from "./db";

// For auth operations (requires direct connection)
export const authPrisma = authDb;

// For general operations (can use pooling)
export const appPrisma = db;

// For backwards compatibility
export const prisma = appPrisma;

export default appPrisma;
