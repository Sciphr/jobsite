// lib/db.js
import { PrismaClient } from "../../app/generated/prisma";

const globalForPrisma = globalThis;

export const db = globalForappPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForappPrisma.prisma = db;
}
